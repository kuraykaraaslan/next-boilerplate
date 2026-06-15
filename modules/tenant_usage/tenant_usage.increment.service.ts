import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import {
  TTL_SECONDS, type TenantUsageMetric,
  currentMonth, redisKey, currentDay, dailyKey, endpointKey,
} from './tenant_usage.keys';

/**
 * Generic increment helper. Used by all increment* methods so that the
 * Redis key format / TTL handling stays consistent. Increment failures are
 * logged but never thrown — usage tracking is best-effort, never blocking
 * the originating action (chat / upload / mail / sms).
 */
export async function increment(
  tenantId: string,
  metric: TenantUsageMetric,
  delta: number,
): Promise<number> {
  if (!tenantId || delta <= 0) return 0;
  const month = currentMonth();
  const key = redisKey(tenantId, metric, month);
  try {
    const newCount = await redis.incrby(key, delta);
    if (newCount === delta) {
      await redis.expire(key, TTL_SECONDS);
    }
    // Daily-granularity counter (within the month) — best-effort.
    try {
      const dayKey = dailyKey(tenantId, metric, currentDay());
      const dayCount = await redis.incrby(dayKey, delta);
      if (dayCount === delta) await redis.expire(dayKey, TTL_SECONDS);
    } catch { /* ignore daily counter errors */ }
    // Peak/watermark for gauge-style metrics (e.g. storageBytes).
    if (metric === 'storageBytes') {
      try {
        const peakKey = `${key}:peak`;
        const peak = Number(await redis.get(peakKey)) || 0;
        if (newCount > peak) { await redis.set(peakKey, String(newCount)); await redis.expire(peakKey, TTL_SECONDS); }
      } catch { /* ignore */ }
    }
    return newCount;
  } catch (error) {
    Logger.warn(
      `TenantUsageService._increment failed for ${metric}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return 0;
  }
}

export async function incrementApiCall(tenantId: string, endpoint?: string): Promise<number> {
  // Per-endpoint breakdown (not just total) — best-effort hash counter.
  if (endpoint) {
    try {
      const hkey = endpointKey(tenantId, currentMonth());
      await redis.hincrby(hkey, endpoint, 1);
      await redis.expire(hkey, TTL_SECONDS);
    } catch { /* ignore */ }
  }
  return increment(tenantId, 'apiCalls', 1);
}

export async function incrementAiTokens(tenantId: string, tokens: number): Promise<void> {
  await increment(tenantId, 'aiTokens', tokens);
}

export async function incrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
  await increment(tenantId, 'storageBytes', bytes);
}

export async function incrementEmailSends(tenantId: string, count: number = 1): Promise<void> {
  await increment(tenantId, 'emailSends', count);
}

export async function incrementSmsSends(tenantId: string, count: number = 1): Promise<void> {
  await increment(tenantId, 'smsSends', count);
}

export async function incrementWebhookCall(tenantId: string, count: number = 1): Promise<void> {
  await increment(tenantId, 'webhookCalls', count);
}

export async function decrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
  if (!tenantId || bytes <= 0) return;
  const month = currentMonth();
  const key = redisKey(tenantId, 'storageBytes', month);
  try {
    await redis.decrby(key, bytes);
  } catch (error) {
    Logger.warn(
      `TenantUsageService.decrementStorageBytes failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
