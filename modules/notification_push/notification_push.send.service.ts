import 'reflect-metadata';
import { In } from 'typeorm';
import webpush from 'web-push';
import { tenantDataSourceFor } from '@/modules/db';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import Logger from '@/modules/logger';
import { PushPayload, VapidDetails, prepareSend, clearCacheForUser } from './notification_push.config';
import { getSubscriptionsForUser } from './notification_push.subscription.service';
import { wantsCategory, isWithinQuietHours, recordOutcome } from './notification_push.metrics.service';
import { RedisIdempotencyService } from '@/modules/redis_idempotency';

async function sendToSubscription(
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
    await recordOutcome(tenantId, true);
    await logDelivery(tenantId, sub, payload, 'sent');
  } catch (error: any) {
    await recordOutcome(tenantId, false);
    await logDelivery(tenantId, sub, payload, 'failed', error?.message);
    if (error.statusCode === 410 || error.statusCode === 404) {
      Logger.warn(`Push subscription ${sub.id} expired (${error.statusCode}), removing.`);
      const ds = await tenantDataSourceFor(tenantId);
      await ds.getRepository(PushSubscriptionEntity).delete({ id: sub.id }).catch(() => {});
      if (sub.userId) await clearCacheForUser(tenantId, sub.userId);
    } else {
      Logger.error(`Push notification failed for ${sub.id}: ${error.message}`);
    }
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
    const { default: NotificationLogService } = await import('@/modules/notification_log/notification_log.service');
    await NotificationLogService.log(tenantId, 'push', sub.userId ?? sub.endpoint, status, {
      subject: payload.title, provider: 'web-push', error,
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
    const vapid = await prepareSend(tenantId);
    if (vapid === false) return;
    // Quiet hours suppress non-urgent (respectQuietHours) deliveries.
    if (opts?.respectQuietHours && await isWithinQuietHours(tenantId, userId)) return;
    const subs = (await getSubscriptionsForUser(tenantId, userId))
      .filter((sub) => wantsCategory(sub, opts?.category));
    await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
  });
}

export async function sendToUsers(
  tenantId: string,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!userIds.length) return;
  const vapid = await prepareSend(tenantId);
  if (vapid === false) return;
  const ds = await tenantDataSourceFor(tenantId);
  const subs = await ds.getRepository(PushSubscriptionEntity).find({
    where: { tenantId, userId: In(userIds) },
  });
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
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
  const vapid = await prepareSend(tenantId);
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
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
}

export async function sendToAdmins(tenantId: string, payload: PushPayload): Promise<void> {
  await sendToRole(tenantId, 'ADMIN', payload);
}

/**
 * Broadcast to every subscriber in {tenantId}. Note: "all" is now scoped
 * to one tenant — there is no cross-tenant broadcast by design.
 */
export async function sendToAll(tenantId: string, payload: PushPayload): Promise<void> {
  const vapid = await prepareSend(tenantId);
  if (vapid === false) return;
  const ds = await tenantDataSourceFor(tenantId);
  const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { tenantId } });
  await Promise.allSettled(subs.map((sub) => sendToSubscription(tenantId, sub, payload, vapid ?? undefined)));
}
