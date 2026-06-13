import 'reflect-metadata';
import { Redis } from 'ioredis';
import redis, { createRedisConnection } from '@/modules/redis';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { v4 as uuid } from 'uuid';
import { NotificationSchema } from './notification_inapp.types';
import type { Notification, NotificationPayload } from './notification_inapp.types';
import NotificationPushService from '@/modules/notification_push/notification_push.service';
import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';

/**
 * NotificationInAppService is fully tenant-scoped. Redis keys and pub/sub
 * channels include the tenantId so the same userId in tenant A can never
 * see notifications addressed to that user in tenant B.
 *
 * Key formats:
 *   - inbox hash:   notifications:{tenantId}:{userId}
 *   - read set:     notifications_read:{tenantId}:{userId}
 *   - pub/sub:      notifications:tenant:{tenantId}:user:{userId}
 */
export default class NotificationInAppService {
  private static notifKey = (tenantId: string, userId: string) =>
    `notifications:${tenantId}:${userId}`;
  private static readKey = (tenantId: string, userId: string) =>
    `notifications_read:${tenantId}:${userId}`;
  static channel = (tenantId: string, userId: string) =>
    `notifications:tenant:${tenantId}:user:${userId}`;

  static MAX_PER_USER = 50;
  static TTL = 7 * 24 * 60 * 60;
  private static optOutKey = (tenantId: string, userId: string) =>
    `notifications_optout:${tenantId}:${userId}`;

  static createSubscriber(): Redis {
    return createRedisConnection();
  }

  /** Per-tenant retention TTL in seconds (`inAppRetentionDays`, default 7d). */
  private static async resolveTtl(tenantId: string): Promise<number> {
    const raw = await SettingService.getValue(tenantId, 'inAppRetentionDays').catch(() => null);
    const days = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 : this.TTL;
  }

  /** User has opted out of a notification category. */
  static async isOptedOut(tenantId: string, userId: string, type?: string | null): Promise<boolean> {
    if (!type) return false;
    return (await redis.sismember(this.optOutKey(tenantId, userId), type).catch(() => 0)) === 1;
  }

  static async setCategoryOptOut(tenantId: string, userId: string, type: string, optedOut: boolean): Promise<void> {
    const key = this.optOutKey(tenantId, userId);
    if (optedOut) await redis.sadd(key, type).catch(() => {});
    else await redis.srem(key, type).catch(() => {});
  }

  /**
   * Quiet hours (`inAppQuietHours` = "HH:MM-HH:MM", server time): suppress the
   * push fan-out (the in-app item is still stored) during the window.
   */
  private static async inQuietHours(tenantId: string): Promise<boolean> {
    const raw = await SettingService.getValue(tenantId, 'inAppQuietHours').catch(() => null);
    const m = raw?.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!m) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const start = +m[1] * 60 + +m[2];
    const end = +m[3] * 60 + +m[4];
    return start <= end ? cur >= start && cur < end : cur >= start || cur < end; // wraps midnight
  }

  static async push(
    tenantId: string,
    userId: string,
    data: NotificationPayload
  ): Promise<Notification | null> {
    // Respect the user's per-category opt-out (in-app + push both suppressed).
    if (await this.isOptedOut(tenantId, userId, data.type)) return null;

    const notification: Notification = {
      notificationId: uuid(),
      title: data.title,
      message: data.message,
      path: data.path ?? null,
      type: data.type ?? null,
      action: data.action ?? null,
      expiresAt: data.expiresAt ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const key = this.notifKey(tenantId, userId);
    await redis.hset(key, notification.notificationId, JSON.stringify(notification));
    await redis.expire(key, await this.resolveTtl(tenantId));

    const all = await this.getAll(tenantId, userId);
    if (all.length > this.MAX_PER_USER) {
      const oldest = all
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, all.length - this.MAX_PER_USER);
      for (const n of oldest) {
        await redis.hdel(key, n.notificationId);
      }
    }

    await redis.publish(this.channel(tenantId, userId), JSON.stringify(notification));

    // Fan out to web-push unless the caller disabled it or we're in quiet hours.
    const fanout = data.pushFanout !== false && !(await this.inQuietHours(tenantId));
    if (fanout) {
      NotificationPushService.sendToUser(tenantId, userId, {
        title: data.title,
        body: data.message,
        url: data.path ?? '/',
        tag: data.type ?? undefined,
      }).catch((err) => Logger.warn('Push notification delivery failed', err));
    }

    return notification;
  }

  static async pushToUsers(
    tenantId: string,
    userIds: string[],
    data: NotificationPayload
  ): Promise<void> {
    await Promise.all(userIds.map((id) => this.push(tenantId, id, data)));
  }

  static async pushToRole(
    tenantId: string,
    role: string,
    data: NotificationPayload
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const members = await ds.getRepository(TenantMember).find({
      where: { tenantId, memberRole: role, memberStatus: 'ACTIVE' },
      select: ['userId'],
    });
    await Promise.all(members.map((m) => this.push(tenantId, m.userId, data)));
  }

  static async pushToAdmins(tenantId: string, data: NotificationPayload): Promise<void> {
    await this.pushToRole(tenantId, 'ADMIN', data);
  }

  /**
   * Broadcast to every active member of {tenantId}. Scoped to a single
   * tenant — there is no cross-tenant broadcast by design.
   */
  static async pushToAll(tenantId: string, data: NotificationPayload): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const members = await ds.getRepository(TenantMember).find({
      where: { tenantId, memberStatus: 'ACTIVE' },
      select: ['userId'],
    });
    await Promise.all(members.map((m) => this.push(tenantId, m.userId, data)));
  }

  static async getAll(tenantId: string, userId: string): Promise<Notification[]> {
    const raw = await redis.hgetall(this.notifKey(tenantId, userId));
    if (!raw) return [];

    const readIds = await this.getReadIds(tenantId, userId);
    const now = Date.now();
    const expiredIds: string[] = [];
    const notifications: Notification[] = Object.values(raw).flatMap((json) => {
      const parsed = NotificationSchema.safeParse(JSON.parse(json));
      if (!parsed.success) {
        Logger.warn('notification_inapp: skipping malformed entry', parsed.error);
        return [];
      }
      const n = parsed.data;
      // Drop (and lazily purge) notifications past their explicit expiry.
      if (n.expiresAt && new Date(n.expiresAt).getTime() <= now) {
        expiredIds.push(n.notificationId);
        return [];
      }
      return [{ ...n, isRead: readIds.has(n.notificationId) }];
    });
    if (expiredIds.length) {
      redis.hdel(this.notifKey(tenantId, userId), ...expiredIds).catch(() => {});
    }

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static async unreadCount(tenantId: string, userId: string): Promise<number> {
    const all = await this.getAll(tenantId, userId);
    return all.filter((n) => !n.isRead).length;
  }

  static async markAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<void> {
    const key = this.readKey(tenantId, userId);
    await redis.sadd(key, notificationId);
    await redis.expire(key, this.TTL);
  }

  static async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    const all = await this.getAll(tenantId, userId);
    if (!all.length) return;
    const key = this.readKey(tenantId, userId);
    await redis.sadd(key, ...all.map((n) => n.notificationId));
    await redis.expire(key, this.TTL);
  }

  static async deleteOne(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<void> {
    await Promise.all([
      redis.hdel(this.notifKey(tenantId, userId), notificationId),
      redis.srem(this.readKey(tenantId, userId), notificationId),
    ]);
  }

  static async clearAll(tenantId: string, userId: string): Promise<void> {
    await Promise.all([
      redis.del(this.notifKey(tenantId, userId)),
      redis.del(this.readKey(tenantId, userId)),
    ]);
  }

  private static async getReadIds(tenantId: string, userId: string): Promise<Set<string>> {
    const members = await redis.smembers(this.readKey(tenantId, userId));
    return new Set(members);
  }
}
