import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import type { Coupon, CouponValidationResult } from '../coupon.types'

/**
 * PayPal has no native coupon/promotion API — discounts are applied by
 * reducing the order amount server-side before creating the PayPal order.
 * This provider is a no-op for sync and returns an empty param map.
 */
export default class PaypalCouponProvider extends BaseCouponProvider {
  readonly name = 'paypal'

  async syncCoupon(_coupon: Coupon): Promise<CouponProviderSyncResult> {
    return { synced: false }
  }

  async getCheckoutCouponParam(_validation: CouponValidationResult): Promise<Record<string, string>> {
    return {}
  }
}
