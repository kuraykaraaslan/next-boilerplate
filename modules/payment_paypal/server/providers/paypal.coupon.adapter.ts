import Logger from '@kuraykaraaslan/logger';
import type { LocalCouponDiscount, PaymentCouponAdapter } from '@kuraykaraaslan/payment/server/payment.coupon.types';

/**
 * PayPal coupon-checkout adapter. PayPal has no server-side coupon registry, so
 * the local discount is expressed as a PayPal Orders v2 discount line item that
 * shows up as a named discount on the customer's receipt. Built purely from the
 * locally-validated discount — no API call, no syncing.
 *
 * Returned under `paypal_discount_item`; the PayPal gateway merges it into the
 * order-create body.
 */
export default class PaypalCouponAdapter implements PaymentCouponAdapter {
  async buildCheckoutParams(discount: LocalCouponDiscount): Promise<Record<string, string>> {
    if (!discount.discountAmount) return {};
    try {
      const discountItem = {
        name: `Discount: ${discount.code}`,
        quantity: '1',
        unit_amount: { currency_code: discount.currency ?? 'USD', value: discount.discountAmount.toFixed(2) },
        category: 'DIGITAL_GOODS',
      };
      return { paypal_discount_item: JSON.stringify(discountItem) };
    } catch (error) {
      Logger.warn(`paypal coupon checkout param failed: ${error}`);
      return {};
    }
  }
}
