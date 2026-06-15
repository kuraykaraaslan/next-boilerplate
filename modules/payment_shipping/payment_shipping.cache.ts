import { tenantDataSourceFor } from '@/modules/db'
import redis, { jitter, singleFlight } from '@/modules/redis'
import { env } from '@/modules/env'
import { ShippingMethod as ShippingMethodEntity } from './entities/shipping_method.entity'
import { ShippingRate as ShippingRateEntity } from './entities/shipping_rate.entity'

/**
 * Active shipping methods + rates change rarely (admin/carrier config) but are
 * loaded on every `calculateShipping` call (checkout/cart estimate). Cache the
 * raw active sets per tenant; rate matching and fee/duty math still run live in
 * the calculator. Invalidated on any method/rate write. (Live carrier-API quotes
 * are cached separately in the carrier adapters.)
 */
const SHIPPING_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 60)

export interface ShippingRuleData {
  methods: ShippingMethodEntity[]
  rates: ShippingRateEntity[]
}

function cacheKey(tenantId: string): string {
  return `payment_shipping:rules:${tenantId}`
}

/** Read-through cache of the tenant's active shipping methods and rates. */
export async function getShippingRuleData(tenantId: string): Promise<ShippingRuleData> {
  const key = cacheKey(tenantId)
  const cached = await redis.get(key).catch(() => null)
  if (cached) {
    try { return JSON.parse(cached) as ShippingRuleData } catch { await redis.del(key).catch(() => {}) }
  }

  return singleFlight(key, async () => {
    const ds = await tenantDataSourceFor(tenantId)
    const [methods, rates] = await Promise.all([
      ds.getRepository(ShippingMethodEntity).find({ where: { tenantId, isActive: true } }),
      ds.getRepository(ShippingRateEntity).find({ where: { tenantId, isActive: true } }),
    ])
    const data: ShippingRuleData = { methods, rates }
    await redis.setex(key, jitter(SHIPPING_CACHE_TTL), JSON.stringify(data)).catch(() => {})
    return data
  })
}

/** Drop the cached shipping rule set for a tenant (call after any method/rate write). */
export async function clearShippingRuleCache(tenantId: string): Promise<void> {
  await redis.del(cacheKey(tenantId)).catch(() => {})
}
