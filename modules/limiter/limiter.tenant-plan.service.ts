import redis from '@/modules/redis';

const WINDOW_MS = 60_000; // 1 minute

export async function checkTenantPlanRateLimit(
  tenantId: string,
  limitPerMinute: number,
): Promise<{ success: boolean; remaining: number; limit: number }> {
  if (limitPerMinute === -1) {
    return { success: true, remaining: Number.POSITIVE_INFINITY, limit: -1 };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `tenant:${tenantId}:ratelimit`;
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
