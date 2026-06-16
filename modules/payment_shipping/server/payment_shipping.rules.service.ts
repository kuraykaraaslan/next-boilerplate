import SettingService from '@nb/setting/server/setting.service'

/**
 * Pure shipping calculation rules — no carrier/API dependency. Carriers bill on
 * the *greater* of actual and dimensional weight, apply handling fees and
 * surcharges, split oversized orders into multiple packages, estimate duties on
 * cross-border shipments, and refuse prohibited items / destinations.
 */

export interface Dimensions { length: number; width: number; height: number } // cm

/**
 * Dimensional (volumetric) weight in kg. `divisor` is the carrier's DIM factor
 * (5000 for most metric express services, 6000 for economy). cm³ / divisor.
 */
export function dimensionalWeight(dims: Dimensions, divisor = 5000): number {
  if (!dims) return 0
  const vol = Math.max(0, dims.length) * Math.max(0, dims.width) * Math.max(0, dims.height)
  return Math.round((vol / divisor) * 1000) / 1000
}

/** Chargeable weight = max(actual, dimensional). */
export function chargeableWeight(actualKg: number, dims?: Dimensions, divisor = 5000): number {
  const dim = dims ? dimensionalWeight(dims, divisor) : 0
  return Math.max(actualKg || 0, dim)
}

export interface ShippingRulesPolicy {
  handlingFee: number            // flat fee added to every shipment
  fuelSurchargePercent: number   // % of base rate
  dimDivisor: number
  maxPackageWeightKg: number     // 0 = no split
  prohibitedCountries: string[]
  prohibitedSkus: string[]
  dutyRatePercent: number        // simple DDP duty estimate when carrier silent
}

export default class PaymentShippingRulesService {
  static async getPolicy(tenantId: string): Promise<ShippingRulesPolicy> {
    const s = await SettingService.getByKeys(tenantId, [
      'shippingHandlingFee', 'shippingFuelSurchargePercent', 'shippingDimDivisor',
      'shippingMaxPackageWeightKg', 'shippingProhibitedCountries', 'shippingProhibitedSkus',
      'shippingDutyRatePercent',
    ]).catch(() => ({} as Record<string, string | null>))
    const num = (v: string | null | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d }
    const list = (v: string | null | undefined) => (v ?? '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
    return {
      handlingFee: num(s.shippingHandlingFee, 0),
      fuelSurchargePercent: num(s.shippingFuelSurchargePercent, 0),
      dimDivisor: num(s.shippingDimDivisor, 5000) || 5000,
      maxPackageWeightKg: num(s.shippingMaxPackageWeightKg, 0),
      prohibitedCountries: list(s.shippingProhibitedCountries),
      prohibitedSkus: list(s.shippingProhibitedSkus),
      dutyRatePercent: num(s.shippingDutyRatePercent, 0),
    }
  }

  /** Apply handling fee + fuel surcharge to a base rate. */
  static applyFees(baseRate: number, policy: ShippingRulesPolicy): number {
    const surcharge = baseRate * (policy.fuelSurchargePercent / 100)
    return Math.round((baseRate + surcharge + policy.handlingFee) * 100) / 100
  }

  /** Number of packages an order splits into given a max package weight. */
  static packageCount(totalWeightKg: number, policy: ShippingRulesPolicy): number {
    if (policy.maxPackageWeightKg <= 0 || totalWeightKg <= 0) return 1
    return Math.max(1, Math.ceil(totalWeightKg / policy.maxPackageWeightKg))
  }

  /** Estimate import duties for a DDP cross-border shipment (rule-based). */
  static estimateDuties(declaredValue: number, policy: ShippingRulesPolicy): number {
    if (policy.dutyRatePercent <= 0 || declaredValue <= 0) return 0
    return Math.round(declaredValue * (policy.dutyRatePercent / 100) * 100) / 100
  }

  /** Throw-free check: is this destination / any sku prohibited? */
  static isProhibited(policy: ShippingRulesPolicy, params: { countryCode?: string; skus?: string[] }): { prohibited: boolean; reason?: string } {
    if (params.countryCode && policy.prohibitedCountries.includes(params.countryCode.toUpperCase())) {
      return { prohibited: true, reason: `Shipping to ${params.countryCode} is restricted` }
    }
    const bad = (params.skus ?? []).map((s) => s.toUpperCase()).find((s) => policy.prohibitedSkus.includes(s))
    if (bad) return { prohibited: true, reason: `Item ${bad} cannot be shipped` }
    return { prohibited: false }
  }
}
