import { tenantDataSourceFor } from '@nb/db'
import redis, { jitter, singleFlight } from '@nb/redis'
import { env } from '@nb/env'
import { TaxClass as TaxClassEntity } from './entities/tax_class.entity'
import { TaxRate as TaxRateEntity } from './entities/tax_rate.entity'

/**
 * Tax classes and active rates change rarely (admin/regulatory) but are loaded on
 * every `calculateTax` call — a checkout hot-path. We cache the raw class + active
 * rate sets per tenant; effective-dating and per-line matching still run live in
 * the calculator, so correctness is unaffected. Invalidated on any class/rate write.
 */
const TAX_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 60) // tax data is stable → 1h default

export interface TaxRuleData {
  classes: TaxClassEntity[]
  rates: TaxRateEntity[]
}

function cacheKey(tenantId: string): string {
  return `payment_tax:rules:${tenantId}`
}

/** Read-through cache of the tenant's tax classes and active rates. */
export async function getTaxRuleData(tenantId: string): Promise<TaxRuleData> {
  const key = cacheKey(tenantId)
  const cached = await redis.get(key).catch(() => null)
  if (cached) {
    try { return JSON.parse(cached) as TaxRuleData } catch { await redis.del(key).catch(() => {}) }
  }

  return singleFlight(key, async () => {
    const ds = await tenantDataSourceFor(tenantId)
    const [classes, rates] = await Promise.all([
      ds.getRepository(TaxClassEntity).find({ where: { tenantId } }),
      ds.getRepository(TaxRateEntity).find({
        where: { tenantId, isActive: true },
        order: { priority: 'ASC', createdAt: 'ASC' },
      }),
    ])
    const data: TaxRuleData = { classes, rates }
    await redis.setex(key, jitter(TAX_CACHE_TTL), JSON.stringify(data)).catch(() => {})
    return data
  })
}

/** Drop the cached tax rule set for a tenant (call after any class/rate write). */
export async function clearTaxRuleCache(tenantId: string): Promise<void> {
  await redis.del(cacheKey(tenantId)).catch(() => {})
}
