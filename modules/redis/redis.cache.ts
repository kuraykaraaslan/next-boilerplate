/**
 * Cache primitives — orthogonal helpers for the per-service cache code in `modules/*`.
 *
 * - `jitter(ttl)` spreads TTL by ±10% so a wave of keys written together don't all expire on the
 *   same second and trigger a thundering-herd refill.
 * - `singleFlight(key, loader)` dedupes concurrent in-process callers loading the same key.
 *   When N requests miss the cache for the same key simultaneously, only one DB query runs;
 *   the rest await the in-flight Promise. Process-local — does not deduplicate across pods.
 */

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
