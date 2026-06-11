import redis from '@/modules/redis';

const TTL_SECONDS = 86400; // 24 hours

export type IdempotencyStatus = 'pending' | 'completed';

export interface IdempotencyRecord {
  status: IdempotencyStatus;
  response?: { body: unknown; statusCode: number };
}

export class RedisIdempotencyService {
  private static key(tenantId: string, idempotencyKey: string): string {
    return `idempotency:${tenantId}:${idempotencyKey}`;
  }

  static async get(tenantId: string, idempotencyKey: string): Promise<IdempotencyRecord | null> {
    const raw = await redis.get(RedisIdempotencyService.key(tenantId, idempotencyKey));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as IdempotencyRecord;
    } catch {
      return null;
    }
  }

  static async setPending(tenantId: string, idempotencyKey: string): Promise<void> {
    const record: IdempotencyRecord = { status: 'pending' };
    await redis.set(RedisIdempotencyService.key(tenantId, idempotencyKey), JSON.stringify(record), 'EX', TTL_SECONDS);
  }

  static async setCompleted(
    tenantId: string,
    idempotencyKey: string,
    response: { body: unknown; statusCode: number },
  ): Promise<void> {
    const record: IdempotencyRecord = { status: 'completed', response };
    await redis.set(RedisIdempotencyService.key(tenantId, idempotencyKey), JSON.stringify(record), 'EX', TTL_SECONDS);
  }
}
