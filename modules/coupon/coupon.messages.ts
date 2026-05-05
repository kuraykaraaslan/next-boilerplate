export const COUPON_MESSAGES = {
  // CRUD
  NOT_FOUND: 'Coupon not found',
  CODE_EXISTS: 'A coupon with this code already exists',
  CREATE_FAILED: 'Failed to create coupon',
  UPDATE_FAILED: 'Failed to update coupon',
  DELETE_FAILED: 'Failed to delete coupon',
  FETCH_FAILED: 'Failed to fetch coupons',

  // Validation
  INVALID_CODE: 'Invalid or expired coupon code',
  COUPON_INACTIVE: 'This coupon is not active',
  COUPON_EXPIRED: 'This coupon has expired',
  COUPON_NOT_STARTED: 'This coupon is not yet valid',
  MAX_USES_REACHED: 'This coupon has reached its maximum number of uses',
  MAX_USES_PER_TENANT_REACHED: 'You have already used this coupon the maximum number of times',
  MINIMUM_AMOUNT_NOT_MET: 'Your order does not meet the minimum amount required for this coupon',
  PLAN_NOT_ELIGIBLE: 'This coupon is not applicable to your selected plan',
  PROVIDER_NOT_ELIGIBLE: 'This coupon is not applicable to your selected payment provider',

  // Apply
  APPLY_FAILED: 'Failed to apply coupon',
  REDEMPTION_CREATE_FAILED: 'Failed to record coupon redemption',

  // Provider sync
  STRIPE_SYNC_FAILED: 'Failed to sync coupon with Stripe',
  PAYPAL_SYNC_FAILED: 'Failed to sync coupon with PayPal',
  IYZICO_SYNC_FAILED: 'Failed to sync coupon with Iyzico',
} as const
