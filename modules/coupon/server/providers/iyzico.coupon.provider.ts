import BaseCouponProvider, { CouponProviderSyncResult } from './base.coupon.provider'
import type { Coupon, CouponValidationResult } from '../coupon.types'
import Logger from '@nb/logger'
import { COUPON_MESSAGES } from '../coupon.messages'

/**
 * Iyzico coupon provider (TR-specific).
 *
 * GOODTOHAVE (multi-country, TR market): Iyzico's payment form supports a
 * `basketItems` array where each item has an `itemType` of `VIRTUAL` and a
 * `price`. A negative-priced basket item represents the discount — it appears
 * as a line item in the iyzico checkout UI and on the customer's receipt.
 *
 * `syncCoupon` is a no-op (no server-side coupon registry in iyzico).
 * `getCheckoutCouponParam` returns a serialised basket-item patch that the
 * iyzico payment module appends to the basket before form creation.
 */
export default class IyzicoCouponProvider extends BaseCouponProvider {
  readonly name = 'iyzico'

  async syncCoupon(_coupon: Coupon): Promise<CouponProviderSyncResult> {
    return { synced: false };
  }

  /**
   * Returns an iyzico basket-item discount line.
   *
   * Expected by the iyzico payment module as:
   *   { 'iyzico_discount_item': JSON.stringify(item) }
   */
  async getCheckoutCouponParam(
    validation: CouponValidationResult,
    _tenantId?: string,
  ): Promise<Record<string, string>> {
    if (!validation.valid || !validation.coupon || !validation.discountAmount) return {};

    try {
      const discountItem = {
        id: `coupon_${validation.coupon.couponId}`,
        name: `İndirim: ${validation.coupon.code}`,
        category1: 'Indirim',
        itemType: 'VIRTUAL',
        price: (-validation.discountAmount).toFixed(2),
      };
      return { 'iyzico_discount_item': JSON.stringify(discountItem) };
    } catch (error) {
      Logger.warn(`${COUPON_MESSAGES.IYZICO_SYNC_FAILED}: ${error}`);
      return {};
    }
  }
}
