/**
 * Contract for the `payment:coupon` extension point.
 *
 * The coupon module validates a code and computes the discount entirely
 * server-side (CouponValidationService) — the LOCAL coupon code is the single
 * source of truth and is NEVER pre-registered/synced to a gateway's own coupon
 * registry. At checkout it hands the resolved discount (below) to the
 * gateway-specific adapter, which turns it into the params that apply the
 * discount at payment time (a one-off Stripe coupon, an iyzico negative basket
 * line, a PayPal discount line item, …).
 */

/** A locally-validated coupon discount, gateway-agnostic. */
export interface LocalCouponDiscount {
  /** The local coupon code — the single source of truth (never synced to the gateway). */
  readonly code: string;
  /** 'PERCENTAGE' applies `discountValue`%; 'FIXED_AMOUNT' takes `discountAmount` off. */
  readonly discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  /** Percent (0–100) or fixed amount, per `discountType`. */
  readonly discountValue: number;
  /** The resolved discount amount in `currency`, computed locally. */
  readonly discountAmount: number;
  readonly currency?: string;
}

/**
 * Builds gateway-specific checkout params that apply a locally-computed coupon
 * discount at payment time. No coupon is ever synced to the gateway.
 */
export interface PaymentCouponAdapter {
  buildCheckoutParams(discount: LocalCouponDiscount, tenantId?: string): Promise<Record<string, string>>;
}

/**
 * Contribution shape for the `payment:coupon` extension point. A payment gateway
 * satellite (e.g. payment_stripe) default-exports one of these; consumers (the
 * coupon module) discover it via the extension registry and never import the
 * adapter class directly.
 */
export interface PaymentCouponContribution {
  /** Stable gateway key (e.g. 'stripe'); must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the coupon-checkout adapter for this gateway. */
  create(): PaymentCouponAdapter;
}
