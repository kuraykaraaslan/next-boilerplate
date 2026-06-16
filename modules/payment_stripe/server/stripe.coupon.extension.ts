import type { PaymentCouponContribution } from '@nb/payment/server/payment.coupon.types';
import StripeCouponAdapter from './providers/stripe.coupon.adapter';

/**
 * Stripe contribution for the `payment:coupon` extension point. The coupon
 * module discovers this via the extension registry and never imports
 * StripeCouponAdapter directly.
 */
const contribution: PaymentCouponContribution = {
  key: 'stripe',
  create: () => new StripeCouponAdapter(),
};

export default contribution;
