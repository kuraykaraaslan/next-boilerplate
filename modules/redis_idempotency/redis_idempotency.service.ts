import redis from '@/modules/redis';

const TTL_SECONDS = 86400; // 24 hours

export type IdempotencyStatus = 'pending' | 'completed';

export interface IdempotencyRecord {
  status: IdempotencyStatus;
  response?: { body: unknown; statusCode: number };
}

export class IdempotencyKey {
  private static key(idempotencyKey: string): string {
    return `idempotency:${idempotencyKey}`;
  }

  static async get(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    const raw = await redis.get(IdempotencyKey.key(idempotencyKey));
    if (!raw) return null;
    return JSON.parse(raw) as IdempotencyRecord;
  }

  static async setPending(idempotencyKey: string): Promise<void> {
    const record: IdempotencyRecord = { status: 'pending' };
    await redis.set(IdempotencyKey.key(idempotencyKey), JSON.stringify(record), 'EX', TTL_SECONDS);
  }

  static async setCompleted(
    idempotencyKey: string,
    response: { body: unknown; statusCode: number },
  ): Promise<void> {
    const record: IdempotencyRecord = { status: 'completed', response };
    await redis.set(IdempotencyKey.key(idempotencyKey), JSON.stringify(record), 'EX', TTL_SECONDS);
  }
}
