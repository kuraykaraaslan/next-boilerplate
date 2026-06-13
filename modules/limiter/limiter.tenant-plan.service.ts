import { randomUUID } from 'crypto';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import ObservabilityService from '@/modules/observability';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';

const WINDOW_MS = 60_000; // 1 minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  /** Seconds to wait before retrying — for the `Retry-After` header. */
  retryAfter: number;
}

/**
 * Sliding-window rate limiter over an arbitrary Redis sorted-set key. A
 * `limitPerMinute` of `-1` means unlimited. Shared by the tenant-plan and
 * per-webhook limiters so they use one battle-tested algorithm.
 */
export async function checkSlidingWindowRateLimit(
  key: string,
  limitPerMinute: number,
): Promise<RateLimitResult> {
  if (limitPerMinute === -1) {
    return { success: true, remaining: Number.POSITIVE_INFINITY, limit: -1, retryAfter: 0 };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const member = `${now}:${randomUUID().replace(/-/g, '')}`;

  try {
    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, '-inf', windowStart);
    pipe.zadd(key, now, member);
    pipe.zcard(key);
    pipe.expire(key, 61);
    pipe.zrange(key, 0, 0, 'WITHSCORES'); // oldest entry → retry-after
    const results = await pipe.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const success = count <= limitPerMinute;

    // Retry-After: when the oldest in-window entry ages out, a slot frees up.
    let retryAfter = 0;
    if (!success) {
      const oldest = results?.[4]?.[1] as string[] | undefined;
      const oldestScore = oldest && oldest.length >= 2 ? Number(oldest[1]) : now;
      retryAfter = Math.max(1, Math.ceil((oldestScore + WINDOW_MS - now) / 1000));
      Logger.warn(`[limiter] sliding-window limit hit: key=${key} count=${count} limit=${limitPerMinute}`);
    }

    return {
      success,
      remaining: Math.max(limitPerMinute - count, 0),
      limit: limitPerMinute,
      retryAfter,
    };
  } catch (err) {
    Logger.warn(`[limiter] Redis pipeline error (fail-open): ${err instanceof Error ? err.message : String(err)}`);
    return { success: true, remaining: limitPerMinute, limit: limitPerMinute, retryAfter: 0 };
  }
}

export async function checkTenantPlanRateLimit(
  tenantId: string,
  limitPerMinute: number,
): Promise<RateLimitResult> {
  // Track every checked call toward the monthly usage counter (best-effort, non-blocking).
  TenantUsageService.incrementApiCall(tenantId).catch(() => {});
  const result = await checkSlidingWindowRateLimit(`tenant:${tenantId}:ratelimit`, limitPerMinute);
  if (!result.success) ObservabilityService.recordRateLimitHit('tenant_plan', tenantId);
  return result;
}

/** Per-endpoint webhook delivery rate limit (deliveries/minute). */
export async function checkWebhookRateLimit(
  webhookId: string,
  limitPerMinute: number,
): Promise<RateLimitResult> {
  return checkSlidingWindowRateLimit(`webhook:${webhookId}:ratelimit`, limitPerMinute);
}
