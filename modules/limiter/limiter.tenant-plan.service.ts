import redis from '@/modules/redis';

const WINDOW_MS = 60_000; // 1 minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
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
    return { success: true, remaining: Number.POSITIVE_INFINITY, limit: -1 };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const member = `${now}:${Math.random().toString(36).slice(2)}`;

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, '-inf', windowStart);
  pipe.zadd(key, now, member);
  pipe.zcard(key);
  pipe.expire(key, 61);
  const results = await pipe.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;

  return {
    success: count <= limitPerMinute,
    remaining: Math.max(limitPerMinute - count, 0),
    limit: limitPerMinute,
  };
}

export async function checkTenantPlanRateLimit(
  tenantId: string,
  limitPerMinute: number,
): Promise<RateLimitResult> {
  return checkSlidingWindowRateLimit(`tenant:${tenantId}:ratelimit`, limitPerMinute);
}

/** Per-endpoint webhook delivery rate limit (deliveries/minute). */
export async function checkWebhookRateLimit(
  webhookId: string,
  limitPerMinute: number,
): Promise<RateLimitResult> {
  return checkSlidingWindowRateLimit(`webhook:${webhookId}:ratelimit`, limitPerMinute);
}
