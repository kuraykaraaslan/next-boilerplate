import { env } from '@/modules/env';
import redis from '@/modules/redis';

export const PAYMENT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export async function clearPaymentCache(paymentId: string): Promise<void> {
  await Promise.all([
    redis.del(`payment:id:${paymentId}`).catch(() => {}),
    redis.del(`payment:tx:${paymentId}`).catch(() => {}),
  ]);
}
