import type { PaymentCouponContribution } from '@kuraykaraaslan/payment/server/payment.coupon.types';
import IyzicoCouponAdapter from './providers/iyzico.coupon.adapter';

/**
 * Iyzico contribution for the `payment:coupon` extension point. The coupon
 * module discovers this via the extension registry and never imports
 * IyzicoCouponAdapter directly.
 */
const contribution: PaymentCouponContribution = {
  key: 'iyzico',
  create: () => new IyzicoCouponAdapter(),
};

export default contribution;
