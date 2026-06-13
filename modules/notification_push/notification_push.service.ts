import 'reflect-metadata';
import { In } from 'typeorm';
import { env } from '@/modules/env';
import webpush from 'web-push';
import { tenantDataSourceFor } from '@/modules/db';
import SettingService from '@/modules/setting/setting.service';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import Logger from '@/modules/logger';
import NotificationPushMessages from './notification_push.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  /** Service-worker notification tag — same tag collapses/replaces (dedup). */
  tag?: string;
  /** Arbitrary structured data delivered to the service worker. */
  data?: Record<string, unknown>;
}

const PUSH_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

let vapidInitialised = false;

function ensureVapid() {
  if (vapidInitialised) return;
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new AppError(NotificationPushMessages.VAPID_NOT_CONFIGURED, 500, ErrorCode.INTERNAL_ERROR);
  }
  webpush.setVapidDetails(
    `mailto:${env.VAPID_CONTACT_EMAIL ?? 'info@example.com'}`,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  vapidInitialised = true;
}

/**
 * NotificationPushService is fully tenant-scoped: subscriptions live in
 * the per-tenant database, so the same browser endpoint registered against
 * tenant A is invisible to tenant B (no cross-tenant push bleed).
 */
type VapidDetails = { subject: string; publicKey: string; privateKey: string };

export default class NotificationPushService {

  /**
   * Per-tenant VAPID keys (white-label correctness): a tenant can ship push from
   * its own application server identity. Returns null when the tenant has no
   * keys, in which case the platform-wide env keys are used.
   */
  private static async resolveVapidDetails(tenantId: string): Promise<VapidDetails | null> {
    const s = await SettingService.getByKeys(tenantId, ['vapidPublicKey', 'vapidPrivateKey', 'vapidContactEmail']).catch(() => ({} as Record<string, string>));
    if (s.vapidPublicKey && s.vapidPrivateKey) {
      return {
        subject: `mailto:${s.vapidContactEmail || env.VAPID_CONTACT_EMAIL || 'info@example.com'}`,
        publicKey: s.vapidPublicKey,
        privateKey: s.vapidPrivateKey,
      };
    }
    return null;
  }

  /** Per-tenant push enable toggle (`pushEnabled` setting, default on). */
  static async isPushEnabled(tenantId: string): Promise<boolean> {
    return (await SettingService.getValue(tenantId, 'pushEnabled').catch(() => null)) !== 'false';
  }

  /**
   * Resolve send context: `false` → suppressed (push disabled); otherwise the
   * per-tenant VAPID details (or null to use the global env keys, ensured here).
   */
  private static async prepareSend(tenantId: string): Promise<VapidDetails | null | false> {
    if (!(await this.isPushEnabled(tenantId))) return false;
    const vapid = await this.resolveVapidDetails(tenantId);
    if (!vapid) ensureVapid();
    return vapid;
  }

  private static cacheKeyForUser(tenantId: string, userId: string): string {
    return `push_subscription:${tenantId}:${userId}`;
  }

  private static async clearCacheForUser(tenantId: string, userId: string): Promise<void> {
    await redis.del(this.cacheKeyForUser(tenantId, userId)).catch(() => {});
  }

  static async getSubscriptionsForUser(
    tenantId: string,
    userId: string
  ): Promise<PushSubscriptionEntity[]> {
    const cacheKey = this.cacheKeyForUser(tenantId, userId);
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached) as PushSubscriptionEntity[]; }
      catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const subs = await ds
        .getRepository(PushSubscriptionEntity)
        .find({ where: { tenantId, userId } });
      const safeForCache = subs.map(({ id, endpoint, userId: uid }) => ({ id, endpoint, userId: uid }));
      await redis.setex(cacheKey, jitter(PUSH_CACHE_TTL), JSON.stringify(safeForCache)).catch(() => {});
      return subs;
    });
  }

  static async subscribe(
    tenantId: string,
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PushSubscriptionEntity);
    const existing = await repo.findOne({
      where: { tenantId, endpoint: subscription.endpoint },
    });
    if (existing) {
      await repo.update(
        { tenantId, endpoint: subscription.endpoint },
        {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        }
      );
      if (existing.userId !== userId) {
        await this.clearCacheForUser(tenantId, existing.userId);
      }
    } else {
      await repo.save(repo.create({
        tenantId,
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }));
    }
    await this.clearCacheForUser(tenantId, userId);
  }

  static async unsubscribe(tenantId: string, userId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(PushSubscriptionEntity).delete({ tenantId, userId });
    await this.clearCacheForUser(tenantId, userId);
  }

  static async unsubscribeByEndpoint(tenantId: string, endpoint: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PushSubscriptionEntity);
    const existing = await repo.findOne({ where: { tenantId, endpoint } });
    await repo.delete({ tenantId, endpoint });
    if (existing) await this.clearCacheForUser(tenantId, existing.userId);
  }

  static async sendToUser(
    tenantId: string,
    userId: string,
    payload: PushPayload
  ): Promise<void> {
    const vapid = await this.prepareSend(tenantId);
    if (vapid === false) return;
    const subs = await this.getSubscriptionsForUser(tenantId, userId);
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
  }

  static async sendToUsers(
    tenantId: string,
    userIds: string[],
    payload: PushPayload
  ): Promise<void> {
    if (!userIds.length) return;
    const vapid = await this.prepareSend(tenantId);
    if (vapid === false) return;
    const ds = await tenantDataSourceFor(tenantId);
    const subs = await ds.getRepository(PushSubscriptionEntity).find({
      where: { tenantId, userId: In(userIds) },
    });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
  }

  /**
   * Broadcast to every active member of {tenantId} with {role}.
   * Uses TenantMember (tenant-scoped roles) instead of the global User.userRole.
   */
  static async sendToRole(
    tenantId: string,
    role: string,
    payload: PushPayload
  ): Promise<void> {
    const vapid = await this.prepareSend(tenantId);
    if (vapid === false) return;
    const ds = await tenantDataSourceFor(tenantId);
    const members = await ds.getRepository(TenantMember).find({
      where: { tenantId, memberRole: role, memberStatus: 'ACTIVE' },
      select: ['userId'],
    });
    if (!members.length) return;
    const subs = await ds.getRepository(PushSubscriptionEntity).find({
      where: { tenantId, userId: In(members.map((m) => m.userId)) },
    });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
  }

  static async sendToAdmins(tenantId: string, payload: PushPayload): Promise<void> {
    await this.sendToRole(tenantId, 'ADMIN', payload);
  }

  /**
   * Broadcast to every subscriber in {tenantId}. Note: "all" is now scoped
   * to one tenant — there is no cross-tenant broadcast by design.
   */
  static async sendToAll(tenantId: string, payload: PushPayload): Promise<void> {
    const vapid = await this.prepareSend(tenantId);
    if (vapid === false) return;
    const ds = await tenantDataSourceFor(tenantId);
    const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { tenantId } });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
  }

  private static async sendToSubscription(
    tenantId: string,
    sub: { id: string; endpoint: string; p256dh: string; auth: string; userId?: string },
    payload: PushPayload,
    vapidDetails?: VapidDetails,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        vapidDetails ? { vapidDetails } : undefined,
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        Logger.warn(`Push subscription ${sub.id} expired (${error.statusCode}), removing.`);
        const ds = await tenantDataSourceFor(tenantId);
        await ds.getRepository(PushSubscriptionEntity).delete({ id: sub.id }).catch(() => {});
        if (sub.userId) await this.clearCacheForUser(tenantId, sub.userId);
      } else {
        Logger.error(`Push notification failed for ${sub.id}: ${error.message}`);
      }
    }
  }
}
