import 'reflect-metadata';
import { Redis } from 'ioredis';
import redis, { createRedisConnection } from '@/modules/redis';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { v4 as uuid } from 'uuid';
import { NotificationSchema } from './notification_inapp.types';
import type { Notification, NotificationPayload } from './notification_inapp.types';
import NotificationPushService from '@/modules/notification_push/notification_push.service';
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

  static createSubscriber(): Redis {
    return createRedisConnection();
  }

  static async push(
    tenantId: string,
    userId: string,
    data: NotificationPayload
  ): Promise<Notification> {
    const notification: Notification = {
      notificationId: uuid(),
      title: data.title,
      message: data.message,
      path: data.path ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const key = this.notifKey(tenantId, userId);
    await redis.hset(key, notification.notificationId, JSON.stringify(notification));
    await redis.expire(key, this.TTL);

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

    NotificationPushService.sendToUser(tenantId, userId, {
      title: data.title,
      body: data.message,
      url: data.path ?? '/',
    }).catch((err) => Logger.warn('Push notification delivery failed', err));

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
    const notifications: Notification[] = Object.values(raw).flatMap((json) => {
      const parsed = NotificationSchema.safeParse(JSON.parse(json));
      if (!parsed.success) {
        Logger.warn('notification_inapp: skipping malformed entry', parsed.error);
        return [];
      }
      const n = parsed.data;
      return [{ ...n, isRead: readIds.has(n.notificationId) }];
    });

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
