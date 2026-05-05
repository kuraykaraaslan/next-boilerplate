import type { Coupon, CouponValidationResult } from '../coupon.types'

export interface CouponProviderSyncResult {
  providerCouponId?: string
  providerPromoCodeId?: string
  synced: boolean
}

/**
 * Optionally syncs a coupon/redemption to the payment provider's own
 * coupon/discount system (e.g. Stripe Coupons). Not required for the discount
 * calculation — that is always done server-side in CouponService.
 */
export default abstract class BaseCouponProvider {
  abstract readonly name: string

  abstract syncCoupon(coupon: Coupon): Promise<CouponProviderSyncResult>

  abstract getCheckoutCouponParam(
    validation: CouponValidationResult
  ): Promise<Record<string, string>>
}
