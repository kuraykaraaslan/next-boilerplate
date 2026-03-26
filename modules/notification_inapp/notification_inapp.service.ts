import { Redis } from "ioredis";
import redis, { createRedisConnection } from "@/libs/redis";
import { systemPrisma } from "@/libs/prisma";
import { v4 as uuid } from "uuid";
import type { Notification, NotificationPayload } from "./notification_inapp.types";
import type { UserRole } from "../user/user.enums";
import NotificationPushService from "../notification_push/notification_push.service";

/**
 * NotificationInAppService
 *
 * Redis keys:
 *   notifications:{userId}       → Hash  { [notificationId]: JSON<Notification> }
 *   notifications_read:{userId}  → Set   { notificationId, ... }
 *
 * Pub/Sub channel:
 *   notifications:{userId}       → publishes JSON<Notification> on every push
 */
export default class NotificationInAppService {
  private static notifKey = (userId: string) => `notifications:${userId}`;
  private static readKey = (userId: string) => `notifications_read:${userId}`;
  private static channel = (userId: string) => `notifications:${userId}`;

  static MAX_PER_USER = 50;
  static TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /** Create a dedicated subscriber connection for SSE routes (caller manages lifecycle) */
  static createSubscriber(): Redis {
    return createRedisConnection();
  }

  // ── Push ────────────────────────────────────────────────────────────────────

  /** Push a notification to a single user */
  static async push(userId: string, data: NotificationPayload): Promise<Notification> {
    const notification: Notification = {
      notificationId: uuid(),
      title: data.title,
      message: data.message,
      path: data.path ?? null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const key = this.notifKey(userId);
    await redis.hset(key, notification.notificationId, JSON.stringify(notification));
    await redis.expire(key, this.TTL);

    // Trim to max — drop oldest entries
    const all = await this.getAll(userId);
    if (all.length > this.MAX_PER_USER) {
      const oldest = all
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, all.length - this.MAX_PER_USER);
      for (const n of oldest) {
        await redis.hdel(key, n.notificationId);
      }
    }

    // Broadcast to SSE subscribers
    await redis.publish(this.channel(userId), JSON.stringify(notification));

    // Web push (fire-and-forget)
    NotificationPushService.sendToUser(userId, {
      title: data.title,
      body: data.message,
      url: data.path ?? "/",
    }).catch(() => {});

    return notification;
  }

  /** Push to multiple users in parallel */
  static async pushToUsers(userIds: string[], data: NotificationPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.push(id, data)));
  }

  /** Push to all users with a specific role (e.g. 'ADMIN', 'USER') */
  static async pushToRole(role: UserRole, data: NotificationPayload): Promise<void> {
    const users = await systemPrisma.user.findMany({
      where: { userRole: role },
      select: { userId: true },
    });
    await Promise.all(users.map((u) => this.push(u.userId, data)));
  }

  /** Push to all admin users */
  static async pushToAdmins(data: NotificationPayload): Promise<void> {
    await this.pushToRole("ADMIN", data);
  }

  /** Push to all active users in the database */
  static async pushToAll(data: NotificationPayload): Promise<void> {
    const users = await systemPrisma.user.findMany({
      where: { userStatus: "ACTIVE" },
      select: { userId: true },
    });
    await Promise.all(users.map((u) => this.push(u.userId, data)));
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  static async getAll(userId: string): Promise<Notification[]> {
    const raw = await redis.hgetall(this.notifKey(userId));
    if (!raw) return [];

    const readIds = await this.getReadIds(userId);
    const notifications: Notification[] = Object.values(raw).map((json) => {
      const n: Notification = JSON.parse(json);
      return { ...n, isRead: readIds.has(n.notificationId) };
    });

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static async unreadCount(userId: string): Promise<number> {
    const all = await this.getAll(userId);
    return all.filter((n) => !n.isRead).length;
  }

  // ── Mark as read ────────────────────────────────────────────────────────────

  static async markAsRead(userId: string, notificationId: string): Promise<void> {
    const key = this.readKey(userId);
    await redis.sadd(key, notificationId);
    await redis.expire(key, this.TTL);
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const all = await this.getAll(userId);
    if (!all.length) return;
    const key = this.readKey(userId);
    await redis.sadd(key, ...all.map((n) => n.notificationId));
    await redis.expire(key, this.TTL);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  static async deleteOne(userId: string, notificationId: string): Promise<void> {
    await Promise.all([
      redis.hdel(this.notifKey(userId), notificationId),
      redis.srem(this.readKey(userId), notificationId),
    ]);
  }

  static async clearAll(userId: string): Promise<void> {
    await Promise.all([
      redis.del(this.notifKey(userId)),
      redis.del(this.readKey(userId)),
    ]);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private static async getReadIds(userId: string): Promise<Set<string>> {
    const members = await redis.smembers(this.readKey(userId));
    return new Set(members);
  }
}
