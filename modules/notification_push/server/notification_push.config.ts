import { env } from '@nb/env';
import webpush from 'web-push';
import redis from '@nb/redis';
import SettingService from '@nb/setting/server/setting.service';
import NotificationPushMessages from './notification_push.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

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

/**
 * NotificationPushService is fully tenant-scoped: subscriptions live in
 * the per-tenant database, so the same browser endpoint registered against
 * tenant A is invisible to tenant B (no cross-tenant push bleed).
 */
export type VapidDetails = { subject: string; publicKey: string; privateKey: string };

export const PUSH_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

export function tenantMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

let vapidInitialised = false;

export function ensureVapid() {
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
 * Per-tenant VAPID keys (white-label correctness): a tenant can ship push from
 * its own application server identity. Returns null when the tenant has no
 * keys, in which case the platform-wide env keys are used.
 */
export async function resolveVapidDetails(tenantId: string): Promise<VapidDetails | null> {
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
export async function isPushEnabled(tenantId: string): Promise<boolean> {
  return (await SettingService.getValue(tenantId, 'pushEnabled').catch(() => null)) !== 'false';
}

/**
 * Resolve send context: `false` → suppressed (push disabled); otherwise the
 * per-tenant VAPID details (or null to use the global env keys, ensured here).
 */
export async function prepareSend(tenantId: string): Promise<VapidDetails | null | false> {
  if (!(await isPushEnabled(tenantId))) return false;
  const vapid = await resolveVapidDetails(tenantId);
  if (!vapid) ensureVapid();
  return vapid;
}

export function cacheKeyForUser(tenantId: string, userId: string): string {
  return `push_subscription:${tenantId}:${userId}`;
}

export async function clearCacheForUser(tenantId: string, userId: string): Promise<void> {
  await redis.del(cacheKeyForUser(tenantId, userId)).catch(() => {});
}
