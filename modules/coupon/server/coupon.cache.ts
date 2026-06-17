import redis from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';

export const COUPON_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
export const NEGATIVE_CACHE_TTL = Math.min(60, COUPON_CACHE_TTL);
export const NEG = '__not_found__';

/** Platform setting key: max active coupons per tenant (plan-tier gate). */
export const SETTING_MAX_ACTIVE_COUPONS = 'couponMaxActive';

export async function clearCache(tenantId: string, coupon: { couponId: string; code: string }): Promise<void> {
  await Promise.all([
    redis.del(`coupon:id:${tenantId}:${coupon.couponId}`).catch(() => {}),
    redis.del(`coupon:code:${tenantId}:${coupon.code.toUpperCase()}`).catch(() => {}),
  ]);
}
