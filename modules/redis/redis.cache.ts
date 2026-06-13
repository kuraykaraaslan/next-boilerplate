/**
 * Cache primitives — orthogonal helpers for the per-service cache code in `modules/*`.
 *
 * - `jitter(ttl)` spreads TTL by ±10% so a wave of keys written together don't all expire on the
 *   same second and trigger a thundering-herd refill.
 * - `singleFlight(key, loader)` dedupes concurrent in-process callers loading the same key.
 * - `singleFlightDistributed(key, loader, ttl)` extends single-flight across pods using a Redis
 *   SET NX lock so only one pod runs the loader at a time (thundering-herd protection at scale).
 * - `tenantKey(tenantId, ...segments)` builds a namespaced Redis key so every tenant's data is
 *   isolated and can be bulk-flushed with `clearTenantCache(tenantId)`.
 * - `clearTenantCache(tenantId)` evicts all Redis keys belonging to a tenant (SCAN + DEL).
 */

import redis from './redis.service';

const inflight = new Map<string, Promise<unknown>>();

export function jitter(ttlSeconds: number, factor = 0.1): number {
  const delta = (Math.random() * 2 - 1) * factor;
  return Math.max(1, Math.round(ttlSeconds * (1 + delta)));
}

export async function singleFlight<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      return await loader();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p as Promise<unknown>);
  return p;
}

/**
 * Cross-pod single-flight via Redis SET NX lock.
 * Only one pod runs `loader`; others wait and then read the result from Redis.
 * Falls back to running the loader directly if Redis is unavailable (fail-open).
 */
export async function singleFlightDistributed<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds: number,
  lockTtlSeconds = 10,
): Promise<T> {
  const lockKey = `lock:sf:${key}`;
  const cacheKey = `sf:${key}`;

  // 1. Check if a cached result already exists (winner already ran).
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    return loader(); // fail-open
  }

  // 2. Try to acquire the lock (SET NX EX).
  let acquired = false;
  try {
    const ok = await redis.set(lockKey, '1', 'EX', lockTtlSeconds, 'NX');
    acquired = ok === 'OK';
  } catch {
    return loader(); // fail-open
  }

  if (acquired) {
    // Winner: run the loader and store the result.
    try {
      const result = await loader();
      await redis.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds).catch(() => {});
      return result;
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  } else {
    // Loser: poll until the winner stores the result or the lock expires.
    const deadline = Date.now() + lockTtlSeconds * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as T;
      } catch {
        break;
      }
    }
    // If we timed out waiting, run the loader ourselves (fail-open).
    return loader();
  }
}

// ── Tenant key namespacing ───────────────────────────────────────────────────

/**
 * Build a namespaced Redis key for a tenant.
 * Pattern: `tenant:<tenantId>:<segment1>:<segment2>...`
 * All keys using this utility can be bulk-flushed with `clearTenantCache`.
 */
export function tenantKey(tenantId: string, ...segments: string[]): string {
  return `tenant:${tenantId}:${segments.join(':')}`;
}

/**
 * Evict all Redis keys belonging to a tenant using SCAN + DEL.
 * Satisfies GDPR right-to-erasure at the cache layer.
 * Safe to call even if no keys exist (no-op).
 */
export async function clearTenantCache(tenantId: string): Promise<void> {
  const pattern = `tenant:${tenantId}:*`;
  let cursor = '0';
  do {
    try {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        await redis.unlink(...keys).catch(() => {});
      }
    } catch {
      break; // fail-open: if Redis is unavailable, skip flush
    }
  } while (cursor !== '0');
}

// ── Graceful fail-open wrapper ───────────────────────────────────────────────

/**
 * Execute a Redis operation with graceful fail-open.
 * When Redis is unavailable the `fallback` value is returned instead of throwing.
 * Use this for non-critical cache reads where serving stale/no data is acceptable.
 */
export async function failOpen<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch {
    return fallback;
  }
}
