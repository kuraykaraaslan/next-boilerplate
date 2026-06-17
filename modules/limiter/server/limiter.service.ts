import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import ObservabilityService from '@kuraykaraaslan/observability';

export const RATE_LIMIT_WINDOW = 60; // seconds

export const LIMITS = {
  auth: 20,
  api: 120,
} as const;

export type LimiterScope = keyof typeof LIMITS;

/** How the limiter behaves when Redis is unavailable. */
export type FailMode = 'open' | 'closed';

export interface RateLimitCheck {
  success: boolean;
  remaining: number;
  limit: number;
  /** Seconds the caller should wait before retrying — for the `Retry-After` header. */
  retryAfter: number;
  /** Unix epoch (seconds) when the window resets. */
  resetAt: number;
}

/**
 * Fixed-window IP rate limit. Emits a `Retry-After` value, a Prometheus
 * rate-limit-hit metric, and honours a fail-open/fail-closed policy for Redis
 * outages (default: fail open, so a cache blip never locks out real traffic;
 * pass `failMode: 'closed'` for endpoints that must never exceed the limit).
 */
export async function check(
  ip: string,
  scope: LimiterScope = 'api',
  opts?: { failMode?: FailMode; tenantId?: string | null },
): Promise<RateLimitCheck> {
  const limit = LIMITS[scope];
  const key = `rate_limit:${scope}:${ip}`;
  const failMode = opts?.failMode ?? 'open';

  try {
    const count = await redis.incr(key);
    let ttl = RATE_LIMIT_WINDOW;
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    } else {
      ttl = await redis.ttl(key).catch(() => RATE_LIMIT_WINDOW);
      if (ttl < 0) ttl = RATE_LIMIT_WINDOW;
    }
    const success = count <= limit;
    if (!success) {
      Logger.warn(`[limiter] rate-limit hit: scope=${scope} ip=${ip}`);
      ObservabilityService.recordRateLimitHit(scope, opts?.tenantId ?? null);
    }
    return {
      success,
      remaining: Math.max(limit - count, 0),
      limit,
      retryAfter: success ? 0 : ttl,
      resetAt: Math.floor(Date.now() / 1000) + ttl,
    };
  } catch (err) {
    Logger.warn(`[limiter] Redis error (fail-${failMode}): ${err instanceof Error ? err.message : String(err)}`);
    if (failMode === 'closed') {
      ObservabilityService.recordRateLimitHit(scope, opts?.tenantId ?? null);
      return { success: false, remaining: 0, limit, retryAfter: RATE_LIMIT_WINDOW, resetAt: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW };
    }
    return { success: true, remaining: limit, limit, retryAfter: 0, resetAt: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW };
  }
}
