export const PAYMENT_SHIPPING_MESSAGES = {
  METHOD_NOT_FOUND: 'Shipping method not found',
  METHOD_CREATE_FAILED: 'Failed to create shipping method',
  METHOD_UPDATE_FAILED: 'Failed to update shipping method',
  METHOD_CODE_TAKEN: 'A shipping method with this code already exists',

  RATE_NOT_FOUND: 'Shipping rate not found',
  RATE_CREATE_FAILED: 'Failed to create shipping rate',
  RATE_UPDATE_FAILED: 'Failed to update shipping rate',

  INVALID_WEIGHT_RANGE: 'minWeight cannot be greater than maxWeight',
  INVALID_SUBTOTAL_RANGE: 'minSubtotal cannot be greater than maxSubtotal',

  CALCULATION_FAILED: 'Failed to calculate shipping quotes',
} as const
