import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import { TenantMember } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import Logger from '@kuraykaraaslan/logger';
import { PushPayload, isPushEnabled, clearCacheForUser } from './notification_push.config';
import { getSubscriptionsForUser } from './notification_push.subscription.service';
import { wantsCategory, isWithinQuietHours, recordOutcome } from './notification_push.metrics.service';
import { RedisIdempotencyService } from '@kuraykaraaslan/redis_idempotency';
import { IsolatedPushProvider } from './providers/isolated.provider';

const PUSH_PROVIDER_POINT = 'push:provider';

/**
 * Resolve the tenant's push backend. Backends are SANDBOXED community plugins (the
 * @push/* family) resolved per-tenant via the external-contributions bridge — no
 * in-tree fallback. Returns null when none is installed (delivery is skipped).
 */
async function resolvePushProvider(tenantId: string): Promise<IsolatedPushProvider | null> {
  const exts = await listExternalContributions(tenantId, PUSH_PROVIDER_POINT);
  if (exts.length === 0) return null;
  const wanted = (await SettingService.getValue(tenantId, 'pushProvider').catch(() => null)) || 'webpush';
  const ext = exts.find((c) => c.key === wanted) ?? exts.find((c) => c.configured) ?? exts[0];
  return new IsolatedPushProvider(ext.invoke);
}

async function sendToSubscription(
  tenantId: string,
  sub: { id: string; endpoint: string; p256dh: string; auth: string; userId?: string },
  payload: PushPayload,
  provider: IsolatedPushProvider,
): Promise<void> {
  const result = await provider.send({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
  if (result.ok) {
    await recordOutcome(tenantId, true);
    await logDelivery(tenantId, sub, payload, 'sent');
    return;
  }
  await recordOutcome(tenantId, false);
  await logDelivery(tenantId, sub, payload, 'failed', result.error);
  // 404/410 = the push subscription is gone — prune it (same as the built-in did).
  if (result.statusCode === 410 || result.statusCode === 404) {
    Logger.warn(`Push subscription ${sub.id} expired (${result.statusCode}), removing.`);
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(PushSubscriptionEntity).delete({ id: sub.id }).catch(() => {});
    if (sub.userId) await clearCacheForUser(tenantId, sub.userId);
  } else {
    Logger.error(`Push notification failed for ${sub.id}: ${result.error}`);
  }
}

/** Audit each push attempt to the central notification_log (best-effort). */
async function logDelivery(
  tenantId: string,
  sub: { endpoint: string; userId?: string },
  payload: PushPayload,
  status: 'sent' | 'failed',
  error?: string,
): Promise<void> {
  try {
    const { default: NotificationLogService } = await import('@kuraykaraaslan/notification_log/server/notification_log.service');
    await NotificationLogService.log(tenantId, 'push', sub.userId ?? sub.endpoint, status, {
      subject: payload.title, provider: 'push', error,
    });
  } catch { /* never let logging break delivery */ }
}

export async function sendToUser(
  tenantId: string,
  userId: string,
  payload: PushPayload,
  opts?: { category?: string; respectQuietHours?: boolean; idempotencyKey?: string },
): Promise<void> {
  // Optional exactly-once guard so a retried event doesn't push twice to a user.
  return RedisIdempotencyService.run(tenantId, opts?.idempotencyKey, async () => {
    if (!(await isPushEnabled(tenantId))) return;
    const provider = await resolvePushProvider(tenantId);
    if (!provider) return;
    // Quiet hours suppress non-urgent (respectQuietHours) deliveries.
    if (opts?.respectQuietHours && await isWithinQuietHours(tenantId, userId)) return;
    const subs = (await getSubscriptionsForUser(tenantId, userId))
      .filter((sub) => wantsCategory(sub, opts?.category));
    await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, provider)));
  });
}

export async function sendToUsers(
  tenantId: string,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!userIds.length) return;
  if (!(await isPushEnabled(tenantId))) return;
  const provider = await resolvePushProvider(tenantId);
  if (!provider) return;
  const ds = await tenantDataSourceFor(tenantId);
  const subs = await ds.getRepository(PushSubscriptionEntity).find({
    where: { tenantId, userId: In(userIds) },
  });
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, provider)));
}

/**
 * Broadcast to every active member of {tenantId} with {role}.
 * Uses TenantMember (tenant-scoped roles) instead of the global User.userRole.
 */
export async function sendToRole(
  tenantId: string,
  role: string,
  payload: PushPayload,
): Promise<void> {
  if (!(await isPushEnabled(tenantId))) return;
  const provider = await resolvePushProvider(tenantId);
  if (!provider) return;
  const ds = await tenantDataSourceFor(tenantId);
  const members = await ds.getRepository(TenantMember).find({
    where: { tenantId, memberRole: role, memberStatus: 'ACTIVE' },
    select: ['userId'],
  });
  if (!members.length) return;
  const subs = await ds.getRepository(PushSubscriptionEntity).find({
    where: { tenantId, userId: In(members.map((m) => m.userId)) },
  });
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, provider)));
}

export async function sendToAdmins(tenantId: string, payload: PushPayload): Promise<void> {
  await sendToRole(tenantId, 'ADMIN', payload);
}

/**
 * Broadcast to every subscriber in {tenantId}. Note: "all" is now scoped
 * to one tenant — there is no cross-tenant broadcast by design.
 */
export async function sendToAll(tenantId: string, payload: PushPayload): Promise<void> {
  if (!(await isPushEnabled(tenantId))) return;
  const provider = await resolvePushProvider(tenantId);
  if (!provider) return;
  const ds = await tenantDataSourceFor(tenantId);
  const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { tenantId } });
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, provider)));
}
