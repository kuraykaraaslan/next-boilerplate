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

  /** Sync to the payment provider's coupon registry (if it has one). `tenantId` enables Stripe Connect resolution. */
  abstract syncCoupon(coupon: Coupon, tenantId?: string): Promise<CouponProviderSyncResult>

  /** Return provider-specific checkout params that apply the discount at payment time. */
  abstract getCheckoutCouponParam(
    validation: CouponValidationResult,
    tenantId?: string,
  ): Promise<Record<string, string>>
}
