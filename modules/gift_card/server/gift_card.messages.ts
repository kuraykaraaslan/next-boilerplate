export const GIFT_CARD_MESSAGES = {
  // CRUD
  NOT_FOUND: 'Gift card not found',
  CREATE_FAILED: 'Failed to issue gift card',
  FETCH_FAILED: 'Failed to fetch gift cards',
  UPDATE_FAILED: 'Failed to update gift card',

  // Redemption
  INVALID_CODE: 'Invalid gift card code',
  NOT_REDEEMABLE: 'This gift card cannot be redeemed',
  ALREADY_REDEEMED: 'This gift card has already been fully redeemed',
  EXPIRED: 'This gift card has expired',
  VOIDED: 'This gift card has been voided',
  INSUFFICIENT_BALANCE: 'The requested amount exceeds the gift card balance',
  CURRENCY_MISMATCH: 'The gift card currency does not match the redemption currency',
  REDEEM_FAILED: 'Failed to redeem gift card',

  // Lifecycle
  ALREADY_VOID: 'This gift card is already void',
  VOID_FAILED: 'Failed to void gift card',
  ADJUST_FAILED: 'Failed to adjust gift card balance',
  PAYMENT_NOT_COMPLETED: 'The gift card purchase payment is not completed yet',
} as const;
