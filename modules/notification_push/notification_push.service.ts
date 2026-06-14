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

function TenantMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

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
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    opts?: { categories?: string[]; consent?: boolean },
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PushSubscriptionEntity);
    const existing = await repo.findOne({
      where: { tenantId, endpoint: subscription.endpoint },
    });
    if (existing) {
      // Ownership verification: an endpoint already owned by a different user
      // cannot be silently re-bound without going through unsubscribe first.
      if (existing.userId !== userId) {
        throw new AppError(NotificationPushMessages.SUBSCRIPTION_OWNERSHIP_MISMATCH, 409, ErrorCode.CONFLICT);
      }
      await repo.update(
        { tenantId, endpoint: subscription.endpoint },
        {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          ...(opts?.categories !== undefined ? { categories: opts.categories } : {}),
          ...(opts?.consent ? { consentAt: new Date() } : {}),
        }
      );
    } else {
      // Per-user subscription cap (setting pushMaxSubscriptionsPerUser, default 10).
      const maxRaw = await SettingService.getValue(tenantId, 'pushMaxSubscriptionsPerUser').catch(() => null);
      const max = Number(maxRaw) > 0 ? Number(maxRaw) : 10;
      const count = await repo.count({ where: { tenantId, userId } });
      if (count >= max) {
        throw new AppError(NotificationPushMessages.SUBSCRIPTION_LIMIT_REACHED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
      await repo.save(repo.create({
        tenantId,
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        categories: opts?.categories ?? null,
        consentAt: opts?.consent ? new Date() : null,
      }));
    }
    await this.clearCacheForUser(tenantId, userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Category preferences + quiet hours
  // ──────────────────────────────────────────────────────────────────────────

  /** Whether a subscription should receive a payload of the given category. */
  private static wantsCategory(sub: { categories?: string[] | null }, category?: string): boolean {
    if (!category) return true;
    if (!sub.categories || sub.categories.length === 0) return true; // all-categories
    return sub.categories.includes(category);
  }

  /**
   * Quiet-hours check: true when the user's local time (from user_preferences
   * timezone) falls within the tenant's configured quiet window. Non-urgent
   * notifications are suppressed during this window.
   */
  static async isWithinQuietHours(tenantId: string, userId: string): Promise<boolean> {
    try {
      const s = await SettingService.getByKeys(tenantId, ['pushQuietHoursStart', 'pushQuietHoursEnd']);
      const start = Number(s.pushQuietHoursStart);
      const end = Number(s.pushQuietHoursEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;

      const { default: UserPreferencesService } = await import('@/modules/user_preferences/user_preferences.service');
      const prefs = await UserPreferencesService.getByUserId(userId).catch(() => null);
      const tz = prefs?.timezone || 'UTC';
      const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date()));
      // Window may wrap midnight (e.g. 22→7).
      return start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
    } catch {
      return false;
    }
  }

  /** Best-effort delivery metric counters (per tenant, rolling). */
  private static async recordOutcome(tenantId: string, ok: boolean): Promise<void> {
    try {
      const key = `push:metrics:${tenantId}:${TenantMonth()}`;
      await redis.hincrby(key, ok ? 'sent' : 'failed', 1);
      await redis.expire(key, 40 * 24 * 60 * 60);
    } catch { /* ignore */ }
  }

  /** Per-tenant push delivery success-rate metrics for the current month. */
  static async getDeliveryMetrics(tenantId: string): Promise<{ sent: number; failed: number; successRate: number }> {
    try {
      const h = await redis.hgetall(`push:metrics:${tenantId}:${TenantMonth()}`);
      const sent = Number(h.sent) || 0;
      const failed = Number(h.failed) || 0;
      const total = sent + failed;
      return { sent, failed, successRate: total ? Math.round((sent / total) * 1000) / 10 : 0 };
    } catch { return { sent: 0, failed: 0, successRate: 0 }; }
  }

  /** Stale-subscription report: endpoints not refreshed in `days` days. */
  static async listStaleSubscriptions(tenantId: string, days = 90): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { LessThan } = await import('typeorm');
    return ds.getRepository(PushSubscriptionEntity).count({ where: { tenantId, updatedAt: LessThan(cutoff) } });
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
    payload: PushPayload,
    opts?: { category?: string; respectQuietHours?: boolean },
  ): Promise<void> {
    const vapid = await this.prepareSend(tenantId);
    if (vapid === false) return;
    // Quiet hours suppress non-urgent (respectQuietHours) deliveries.
    if (opts?.respectQuietHours && await this.isWithinQuietHours(tenantId, userId)) return;
    const subs = (await this.getSubscriptionsForUser(tenantId, userId))
      .filter((sub) => this.wantsCategory(sub, opts?.category));
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
      await this.recordOutcome(tenantId, true);
      await this.logDelivery(tenantId, sub, payload, 'sent');
    } catch (error: any) {
      await this.recordOutcome(tenantId, false);
      await this.logDelivery(tenantId, sub, payload, 'failed', error?.message);
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

  /** Audit each push attempt to the central notification_log (best-effort). */
  private static async logDelivery(
    tenantId: string,
    sub: { endpoint: string; userId?: string },
    payload: PushPayload,
    status: 'sent' | 'failed',
    error?: string,
  ): Promise<void> {
    try {
      const { default: NotificationLogService } = await import('@/modules/notification_log/notification_log.service');
      await NotificationLogService.log(tenantId, 'push', sub.userId ?? sub.endpoint, status, {
        subject: payload.title, provider: 'web-push', error,
      });
    } catch { /* never let logging break delivery */ }
  }
}
