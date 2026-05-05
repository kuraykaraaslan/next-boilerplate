import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import type { Coupon, CouponValidationResult } from '../coupon.types'

/**
 * Iyzico has no native coupon API — discounts are applied by reducing the
 * basket total server-side before creating the Iyzico payment form.
 * This provider is a no-op for sync and returns an empty param map.
 */
export default class IyzicoCouponProvider extends BaseCouponProvider {
  readonly name = 'iyzico'

  async syncCoupon(_coupon: Coupon): Promise<CouponProviderSyncResult> {
    return { synced: false }
  }

  async getCheckoutCouponParam(_validation: CouponValidationResult): Promise<Record<string, string>> {
    return {}
  }
}
