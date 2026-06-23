export const PAYMENT_RETURN_RMA_MESSAGES = {
  RETURN_NOT_FOUND: 'Return request not found',
  RETURN_CREATE_FAILED: 'Failed to create return request',
  RETURN_ALREADY_COMPLETED: 'Return request has already been completed',
  RETURN_ALREADY_CANCELLED: 'Return request has already been cancelled',
  RETURN_ALREADY_REJECTED: 'Return request has already been rejected',

  INVALID_STATUS_TRANSITION: 'Invalid return status transition',

  ITEMS_REQUIRED: 'At least one return item is required',

  INVALID_REFUND_AMOUNT: 'Invalid refund amount',
  REFUND_FAILED: 'Failed to process refund through the payment provider',

  RETURN_WINDOW_EXPIRED: 'The return window for this purchase has expired',
  EXCHANGES_NOT_ALLOWED: 'Exchanges are not enabled for this tenant',

  EVENT_LOG_FAILED: 'Failed to log return event',

  RETURN_LINE_NOT_FOUND: 'Return line not found',
  RETURN_LINE_CREATE_FAILED: 'Failed to add return line',

  RETURN_REASON_NOT_FOUND: 'Return reason not found',
  RETURN_REASON_CREATE_FAILED: 'Failed to create return reason',
} as const
