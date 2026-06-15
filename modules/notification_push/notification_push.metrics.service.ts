import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import SettingService from '@/modules/setting/setting.service';
import redis from '@/modules/redis';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import { tenantMonth } from './notification_push.config';

/** Whether a subscription should receive a payload of the given category. */
export function wantsCategory(sub: { categories?: string[] | null }, category?: string): boolean {
  if (!category) return true;
  if (!sub.categories || sub.categories.length === 0) return true; // all-categories
  return sub.categories.includes(category);
}

/**
 * Quiet-hours check: true when the user's local time (from user_preferences
 * timezone) falls within the tenant's configured quiet window. Non-urgent
 * notifications are suppressed during this window.
 */
export async function isWithinQuietHours(tenantId: string, userId: string): Promise<boolean> {
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
export async function recordOutcome(tenantId: string, ok: boolean): Promise<void> {
  try {
    const key = `push:metrics:${tenantId}:${tenantMonth()}`;
    await redis.hincrby(key, ok ? 'sent' : 'failed', 1);
    await redis.expire(key, 40 * 24 * 60 * 60);
  } catch { /* ignore */ }
}

/** Per-tenant push delivery success-rate metrics for the current month. */
export async function getDeliveryMetrics(tenantId: string): Promise<{ sent: number; failed: number; successRate: number }> {
  try {
    const h = await redis.hgetall(`push:metrics:${tenantId}:${tenantMonth()}`);
    const sent = Number(h.sent) || 0;
    const failed = Number(h.failed) || 0;
    const total = sent + failed;
    return { sent, failed, successRate: total ? Math.round((sent / total) * 1000) / 10 : 0 };
  } catch { return { sent: 0, failed: 0, successRate: 0 }; }
}

/** Stale-subscription report: endpoints not refreshed in `days` days. */
export async function listStaleSubscriptions(tenantId: string, days = 90): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { LessThan } = await import('typeorm');
  return ds.getRepository(PushSubscriptionEntity).count({ where: { tenantId, updatedAt: LessThan(cutoff) } });
}
