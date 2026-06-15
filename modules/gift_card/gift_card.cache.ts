import redis from '@/modules/redis';

export const GIFT_CARD_CACHE_TTL = 300; // 5 min
export const NEGATIVE_CACHE_TTL = 60; // 1 min
export const NEG = '__none__';

export const idKey = (tenantId: string, giftCardId: string) => `gift_card:id:${tenantId}:${giftCardId}`;
export const hashKey = (tenantId: string, codeHash: string) => `gift_card:hash:${tenantId}:${codeHash}`;

export async function clearCache(
  tenantId: string,
  card: { giftCardId?: string; codeHash?: string },
): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (card.giftCardId) ops.push(redis.del(idKey(tenantId, card.giftCardId)));
  if (card.codeHash) ops.push(redis.del(hashKey(tenantId, card.codeHash)));
  await Promise.all(ops).catch(() => {});
}
