import 'reflect-metadata';
import { In } from 'typeorm';
import { env } from '@/modules/env';
import webpush from 'web-push';
import { getSystemDataSource } from '@/modules/db';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import { User as UserEntity } from '../user/entities/user.entity';
import Logger from '@/modules/logger';
import type { UserRole } from '../user/user.enums';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

let vapidInitialised = false;

function ensureVapid() {
  if (vapidInitialised) return;
  webpush.setVapidDetails(
    `mailto:${env.VAPID_CONTACT_EMAIL ?? 'info@example.com'}`,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!
  );
  vapidInitialised = true;
}

export default class NotificationPushService {

  static async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(PushSubscriptionEntity);
    const existing = await repo.findOne({ where: { endpoint: subscription.endpoint } });
    if (existing) {
      await repo.update({ endpoint: subscription.endpoint }, {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
    } else {
      await repo.save(repo.create({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }));
    }
  }

  static async unsubscribe(userId: string): Promise<void> {
    const ds = await getSystemDataSource();
    await ds.getRepository(PushSubscriptionEntity).delete({ userId });
  }

  static async unsubscribeByEndpoint(endpoint: string): Promise<void> {
    const ds = await getSystemDataSource();
    await ds.getRepository(PushSubscriptionEntity).delete({ endpoint });
  }

  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    ensureVapid();
    const ds = await getSystemDataSource();
    const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { userId } });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  static async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    ensureVapid();
    const ds = await getSystemDataSource();
    const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { userId: In(userIds) } });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  static async sendToRole(role: UserRole, payload: PushPayload): Promise<void> {
    ensureVapid();
    const ds = await getSystemDataSource();
    const users = await ds.getRepository(UserEntity).find({
      where: { userRole: role },
      select: ['userId'],
    });
    const subs = await ds.getRepository(PushSubscriptionEntity).find({
      where: { userId: In(users.map((u) => u.userId)) },
    });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  static async sendToAdmins(payload: PushPayload): Promise<void> {
    await this.sendToRole('ADMIN', payload);
  }

  static async sendToAll(payload: PushPayload): Promise<void> {
    ensureVapid();
    const ds = await getSystemDataSource();
    const subs = await ds.getRepository(PushSubscriptionEntity).find();
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  private static async sendToSubscription(
    sub: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        Logger.warn(`Push subscription ${sub.id} expired (${error.statusCode}), removing.`);
        const ds = await getSystemDataSource();
        await ds.getRepository(PushSubscriptionEntity).delete({ id: sub.id }).catch(() => {});
      } else {
        Logger.error(`Push notification failed for ${sub.id}: ${error.message}`);
      }
    }
  }
}
