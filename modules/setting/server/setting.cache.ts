import redis from '@nb/redis';

const REDIS_KEY_PREFIX = 'settings:';
const REDIS_TTL = 600;

export function getCacheKey(tenantId: string, key?: string): string {
  return key
    ? `${REDIS_KEY_PREFIX}${tenantId}:${key}`
    : `${REDIS_KEY_PREFIX}${tenantId}:all`;
}

export async function getFromCache(cacheKey: string): Promise<string | null> {
  try { return await redis.get(cacheKey); } catch { return null; }
}

export async function setCache(cacheKey: string, value: string): Promise<void> {
  try { await redis.set(cacheKey, value, 'EX', REDIS_TTL); } catch {}
}

export async function deleteCache(cacheKey: string): Promise<void> {
  try { await redis.del(cacheKey); } catch {}
}

// ── Bulk cache invalidation via Redis pattern match ──────────────────────
export async function clearCache(tenantId: string): Promise<void> {
  const pattern = `${REDIS_KEY_PREFIX}${tenantId}:*`;
  let cursor = '0';
  do {
    try {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.unlink(...keys).catch(() => {});
    } catch { break; }
  } while (cursor !== '0');
}
