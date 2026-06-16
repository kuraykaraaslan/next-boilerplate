import Logger from '@nb/logger';
import type { LocalCouponDiscount, PaymentCouponAdapter } from '@nb/payment/server/payment.coupon.types';

/**
 * Iyzico coupon-checkout adapter (TR market). Iyzico has no server-side coupon
 * registry, so the local discount is expressed as a negative-priced `VIRTUAL`
 * basket item — it shows up as a discount line in the iyzico checkout UI and on
 * the receipt. Built purely from the locally-validated discount.
 *
 * Returned under `iyzico_discount_item`; the iyzico gateway appends it to the
 * basket before form creation.
 */
export default class IyzicoCouponAdapter implements PaymentCouponAdapter {
  async buildCheckoutParams(discount: LocalCouponDiscount): Promise<Record<string, string>> {
    if (!discount.discountAmount) return {};
    try {
      const discountItem = {
        id: `coupon_${discount.code}`,
        name: `İndirim: ${discount.code}`,
        category1: 'Indirim',
        itemType: 'VIRTUAL',
        price: (-discount.discountAmount).toFixed(2),
      };
      return { iyzico_discount_item: JSON.stringify(discountItem) };
    } catch (error) {
      Logger.warn(`iyzico coupon checkout param failed: ${error}`);
      return {};
    }
  }
}
