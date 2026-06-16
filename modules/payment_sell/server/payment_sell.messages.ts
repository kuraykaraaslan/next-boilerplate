export const PAYMENT_SELL_MESSAGES = {
  PAYMENT_NOT_FOUND: 'Payment not found',
  PAYMENT_ALREADY_COMPLETED: 'Payment has already been completed',
  PAYMENT_ALREADY_CANCELLED: 'Payment has already been cancelled',
  PAYMENT_ALREADY_REFUNDED: 'Payment has already been refunded',
  PAYMENT_EXPIRED: 'Payment has expired',
  PAYMENT_NOT_REFUNDABLE: 'Payment cannot be refunded in its current state',
  INVALID_PAYMENT_AMOUNT: 'Invalid payment amount',
  INVALID_REFUND_AMOUNT: 'Refund amount exceeds original payment amount',

  TRANSACTION_NOT_FOUND: 'Transaction not found',
  TRANSACTION_CREATE_FAILED: 'Failed to create transaction',

  CHECKOUT_CREATE_FAILED: 'Failed to create checkout session',
  CHECKOUT_SESSION_EXPIRED: 'Checkout session has expired',
  VELOCITY_EXCEEDED: 'Too many payment attempts. Please wait a few minutes and try again.',
  REFUND_WINDOW_EXPIRED: 'The refund window for this payment has expired',
  NO_PROVIDER_AVAILABLE: 'No payment provider is currently available',

  WEBHOOK_INVALID_SIGNATURE: 'Invalid webhook signature',
  WEBHOOK_UNKNOWN_EVENT: 'Unknown or unhandled webhook event type',
  WEBHOOK_PROCESSING_FAILED: 'Failed to process webhook event',
  WEBHOOK_PAYMENT_NOT_FOUND: 'Payment not found for webhook event',

  REFUND_FAILED: 'Failed to process refund',
  STATUS_FETCH_FAILED: 'Failed to fetch payment status from provider',
} as const
