export const ORDER_FULFILLMENT_MESSAGES = {
  FULFILLMENT_NOT_FOUND: 'Fulfillment not found',
  FULFILLMENT_CREATE_FAILED: 'Failed to create fulfillment',
  FULFILLMENT_ALREADY_DELIVERED: 'Fulfillment has already been delivered',
  FULFILLMENT_ALREADY_CANCELLED: 'Fulfillment has already been cancelled',

  INVALID_STATUS_TRANSITION: 'Invalid fulfillment status transition',

  ITEMS_REQUIRED: 'At least one fulfillment item is required',

  TRACKING_REQUIRED: 'Tracking number and carrier are required',

  EVENT_LOG_FAILED: 'Failed to log fulfillment event',
} as const
