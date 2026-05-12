import redis from '@/modules/redis';

export const RATE_LIMIT_WINDOW = 60; // seconds

export const LIMITS = {
  auth: 20,
  api: 120,
} as const;

export type LimiterScope = keyof typeof LIMITS;

export async function check(
  ip: string,
  scope: LimiterScope = 'api',
): Promise<{ success: boolean; remaining: number; limit: number }> {
  const limit = LIMITS[scope];
  const key = `rate_limit:${scope}:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  return {
    success: count <= limit,
    remaining: Math.max(limit - count, 0),
    limit,
  };
}
