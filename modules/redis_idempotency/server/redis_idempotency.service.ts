import redis from '@nb/redis';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const TTL_SECONDS = 86400; // 24 hours
const KEY_MIN = 8;
const KEY_MAX = 255;
const KEY_RE = /^[A-Za-z0-9._:-]+$/;

export type IdempotencyStatus = 'pending' | 'completed';

export interface IdempotencyRecord {
  status: IdempotencyStatus;
  response?: { body: unknown; statusCode: number };
}

export interface AcquireResult {
  /** True when this caller claimed the key and should execute the operation. */
  acquired: boolean;
  /** Present when another caller already created the record (pending or completed). */
  existing?: IdempotencyRecord;
  /** True when Redis was unavailable and we proceeded without a guarantee. */
  degraded?: boolean;
}

/**
 * Idempotency-key store. Hardened for production:
 *  - **Atomic claim** via `SET NX` so two pods racing the same key cannot both
 *    execute (the previous plain `SET` allowed a race).
 *  - **Key validation** (length + charset) to reject abusive keys.
 *  - **Graceful degradation** — a Redis outage never throws; the request
 *    proceeds without the idempotency guarantee rather than failing.
 *  - **Metrics** — hit / miss / collision counters for observability.
 */
export class RedisIdempotencyService {
  private static key(tenantId: string, idempotencyKey: string): string {
    return `idempotency:${tenantId}:${idempotencyKey}`;
  }

  /** Validate an incoming idempotency key; throws 422 on malformed input. */
  static validateKey(idempotencyKey: string): void {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < KEY_MIN ||
      idempotencyKey.length > KEY_MAX ||
      !KEY_RE.test(idempotencyKey)
    ) {
      throw new AppError(
        `Idempotency-Key must be ${KEY_MIN}-${KEY_MAX} chars of [A-Za-z0-9._:-].`,
        422,
        ErrorCode.VALIDATION_ERROR,
      );
    }
  }

  private static bumpMetric(name: 'hit' | 'miss' | 'collision'): void {
    redis.incr(`idempotency:metrics:${name}`).catch(() => {});
  }

  static async get(tenantId: string, idempotencyKey: string): Promise<IdempotencyRecord | null> {
    try {
      const raw = await redis.get(RedisIdempotencyService.key(tenantId, idempotencyKey));
      if (!raw) return null;
      return JSON.parse(raw) as IdempotencyRecord;
    } catch (err) {
      Logger.warn(`[idempotency] get failed (degraded): ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Atomically claim the key. Returns `{ acquired: true }` for the first caller;
   * a later caller gets `{ acquired: false, existing }` with the in-flight or
   * completed record. On a Redis outage returns `{ acquired: true, degraded: true }`.
   */
  static async acquire(tenantId: string, idempotencyKey: string): Promise<AcquireResult> {
    RedisIdempotencyService.validateKey(idempotencyKey);
    const k = RedisIdempotencyService.key(tenantId, idempotencyKey);
    const pending: IdempotencyRecord = { status: 'pending' };
    try {
      const ok = await redis.set(k, JSON.stringify(pending), 'EX', TTL_SECONDS, 'NX');
      if (ok === 'OK') {
        RedisIdempotencyService.bumpMetric('miss');
        return { acquired: true };
      }
      // Lost the race — return whatever is stored.
      RedisIdempotencyService.bumpMetric('collision');
      const existing = await RedisIdempotencyService.get(tenantId, idempotencyKey);
      return { acquired: false, existing: existing ?? pending };
    } catch (err) {
      Logger.warn(`[idempotency] acquire failed (degraded, proceeding): ${err instanceof Error ? err.message : String(err)}`);
      return { acquired: true, degraded: true };
    }
  }

  static async setPending(tenantId: string, idempotencyKey: string): Promise<void> {
    try {
      await redis.set(
        RedisIdempotencyService.key(tenantId, idempotencyKey),
        JSON.stringify({ status: 'pending' } satisfies IdempotencyRecord),
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      Logger.warn(`[idempotency] setPending failed (degraded): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static async setCompleted(
    tenantId: string,
    idempotencyKey: string,
    response: { body: unknown; statusCode: number },
  ): Promise<void> {
    const record: IdempotencyRecord = { status: 'completed', response };
    try {
      await redis.set(RedisIdempotencyService.key(tenantId, idempotencyKey), JSON.stringify(record), 'EX', TTL_SECONDS);
      RedisIdempotencyService.bumpMetric('hit');
    } catch (err) {
      Logger.warn(`[idempotency] setCompleted failed (degraded): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Release a key (delete the record) so a legitimate retry can re-run the
   * operation — called when the wrapped operation throws before completing, so a
   * transient failure isn't permanently "claimed" for the next 24h.
   */
  static async release(tenantId: string, idempotencyKey: string): Promise<void> {
    try {
      await redis.del(RedisIdempotencyService.key(tenantId, idempotencyKey));
    } catch (err) {
      Logger.warn(`[idempotency] release failed (degraded): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Wrap a side-effecting operation with exactly-once semantics keyed by
   * `idempotencyKey`. This is the canonical entry point for write paths:
   *
   *  - No key supplied → run unguarded (backward compatible).
   *  - First caller claims the key, runs the op, and stores the result.
   *  - A duplicate that arrives *after* completion replays the stored result.
   *  - A duplicate that arrives while the first is still in flight is refused
   *    with 409 rather than risking a second side effect (double charge / mail / …).
   *  - If the op throws, the claim is released so a real retry can proceed.
   *  - If Redis is unavailable the op runs unguarded (fail-open).
   *
   * Stored results round-trip through JSON, so callers that need class instances
   * should re-parse the returned value (e.g. via their Zod schema).
   */
  static async run<T>(
    tenantId: string,
    idempotencyKey: string | undefined | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!idempotencyKey) return operation();
    RedisIdempotencyService.validateKey(idempotencyKey);

    const claim = await RedisIdempotencyService.acquire(tenantId, idempotencyKey);

    if (claim.acquired || claim.degraded) {
      // We own the key (or Redis is down → proceed without the guarantee).
      try {
        const result = await operation();
        await RedisIdempotencyService.setCompleted(tenantId, idempotencyKey, { body: result, statusCode: 200 });
        return result;
      } catch (err) {
        if (!claim.degraded) await RedisIdempotencyService.release(tenantId, idempotencyKey);
        throw err;
      }
    }

    // Another caller already claimed this key.
    if (claim.existing?.status === 'completed' && claim.existing.response) {
      return claim.existing.response.body as T;
    }
    // Still in flight elsewhere — refuse rather than double-execute.
    throw new AppError(
      'A request with this Idempotency-Key is already being processed.',
      409,
      ErrorCode.CONFLICT,
    );
  }

  /** Best-effort cumulative counters for dashboards. */
  static async getStats(): Promise<{ hit: number; miss: number; collision: number }> {
    try {
      const [hit, miss, collision] = await redis.mget(
        'idempotency:metrics:hit',
        'idempotency:metrics:miss',
        'idempotency:metrics:collision',
      );
      return { hit: Number(hit) || 0, miss: Number(miss) || 0, collision: Number(collision) || 0 };
    } catch {
      return { hit: 0, miss: 0, collision: 0 };
    }
  }
}
