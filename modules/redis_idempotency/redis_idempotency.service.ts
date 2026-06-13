import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';

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
