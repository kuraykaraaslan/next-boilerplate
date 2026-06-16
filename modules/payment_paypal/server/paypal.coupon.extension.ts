import type { PaymentCouponContribution } from '@nb/payment/server/payment.coupon.types';
import PaypalCouponAdapter from './providers/paypal.coupon.adapter';

/**
 * PayPal contribution for the `payment:coupon` extension point. The coupon
 * module discovers this via the extension registry and never imports
 * PaypalCouponAdapter directly.
 */
const contribution: PaymentCouponContribution = {
  key: 'paypal',
  create: () => new PaypalCouponAdapter(),
};

export default contribution;
