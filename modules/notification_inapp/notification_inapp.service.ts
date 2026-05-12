import 'reflect-metadata';
import { Redis } from 'ioredis';
import redis, { createRedisConnection } from '@/modules/redis';
import { getSystemDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import { v4 as uuid } from 'uuid';
import type { Notification, NotificationPayload } from './notification_inapp.types';
import type { UserRole } from '../user/user.enums';
import NotificationPushService from '../notification_push/notification_push.service';

export default class NotificationInAppService {
  private static notifKey = (userId: string) => `notifications:${userId}`;
  private static readKey = (userId: string) => `notifications_read:${userId}`;
  private static channel = (userId: string) => `notifications:${userId}`;

  static MAX_PER_USER = 50;
  static TTL = 7 * 24 * 60 * 60;

  static createSubscriber(): Redis {
    return createRedisConnection();
  }

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

    const all = await this.getAll(userId);
    if (all.length > this.MAX_PER_USER) {
      const oldest = all
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, all.length - this.MAX_PER_USER);
      for (const n of oldest) {
        await redis.hdel(key, n.notificationId);
      }
    }

    await redis.publish(this.channel(userId), JSON.stringify(notification));

    NotificationPushService.sendToUser(userId, {
      title: data.title,
      body: data.message,
      url: data.path ?? '/',
    }).catch(() => {});

    return notification;
  }

  static async pushToUsers(userIds: string[], data: NotificationPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.push(id, data)));
  }

  static async pushToRole(role: UserRole, data: NotificationPayload): Promise<void> {
    const ds = await getSystemDataSource();
    const users = await ds.getRepository(UserEntity).find({
      where: { userRole: role },
      select: ['userId'],
    });
    await Promise.all(users.map((u) => this.push(u.userId, data)));
  }

  static async pushToAdmins(data: NotificationPayload): Promise<void> {
    await this.pushToRole('ADMIN', data);
  }

  static async pushToAll(data: NotificationPayload): Promise<void> {
    const ds = await getSystemDataSource();
    const users = await ds.getRepository(UserEntity).find({
      where: { userStatus: 'ACTIVE' },
      select: ['userId'],
    });
    await Promise.all(users.map((u) => this.push(u.userId, data)));
  }

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

  private static async getReadIds(userId: string): Promise<Set<string>> {
    const members = await redis.smembers(this.readKey(userId));
    return new Set(members);
  }
}
