import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity';
import NotificationPushMessages from './notification_push.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { PUSH_CACHE_TTL, cacheKeyForUser, clearCacheForUser } from './notification_push.config';

export async function getSubscriptionsForUser(
  tenantId: string,
  userId: string,
): Promise<PushSubscriptionEntity[]> {
  const cacheKey = cacheKeyForUser(tenantId, userId);
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

export async function subscribe(
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
  await clearCacheForUser(tenantId, userId);
}

export async function unsubscribe(tenantId: string, userId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.getRepository(PushSubscriptionEntity).delete({ tenantId, userId });
  await clearCacheForUser(tenantId, userId);
}

export async function unsubscribeByEndpoint(tenantId: string, endpoint: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(PushSubscriptionEntity);
  const existing = await repo.findOne({ where: { tenantId, endpoint } });
  await repo.delete({ tenantId, endpoint });
  if (existing) await clearCacheForUser(tenantId, existing.userId);
}
