export const PAYMENT_MESSAGES = {
  // General
  PROVIDER_NOT_FOUND: 'Payment provider not found',
  PROVIDER_NOT_CONFIGURED: 'Payment provider not configured',
  INVALID_TOKEN: 'Invalid payment token',

  // Payment CRUD
  PAYMENT_NOT_FOUND: 'Payment not found',
  PAYMENT_CREATE_FAILED: 'Failed to create payment',
  PAYMENT_UPDATE_FAILED: 'Failed to update payment',
  PAYMENT_DELETE_FAILED: 'Failed to delete payment',
  PAYMENT_ALREADY_COMPLETED: 'Payment has already been completed',
  PAYMENT_ALREADY_CANCELLED: 'Payment has already been cancelled',
  PAYMENT_ALREADY_REFUNDED: 'Payment has already been refunded',
  PAYMENT_EXPIRED: 'Payment has expired',
  INVALID_PAYMENT_AMOUNT: 'Invalid payment amount',
  INVALID_PAYMENT_CURRENCY: 'Invalid payment currency',

  // Transaction CRUD
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  TRANSACTION_CREATE_FAILED: 'Failed to create transaction',
  TRANSACTION_UPDATE_FAILED: 'Failed to update transaction',
  TRANSACTION_FAILED: 'Transaction failed',

  // Refund
  REFUND_FAILED: 'Refund failed',
  REFUND_AMOUNT_EXCEEDS_PAYMENT: 'Refund amount exceeds payment amount',
  REFUND_NOT_ALLOWED: 'Refund is not allowed for this payment',

  // Provider Status
  GET_STATUS_FAILED: 'Failed to get payment status',

  // PayPal
  PAYPAL_ACCESS_TOKEN_FAILED: 'Failed to obtain PayPal access token',
  PAYPAL_GET_STATUS_FAILED: 'Failed to get PayPal payment status',
  PAYPAL_CREATE_ORDER_FAILED: 'Failed to create PayPal order',
  PAYPAL_CAPTURE_FAILED: 'Failed to capture PayPal payment',
  PAYPAL_REFUND_FAILED: 'Failed to process PayPal refund',

  // Stripe
  STRIPE_GET_STATUS_FAILED: 'Failed to get Stripe payment status',
  STRIPE_CREATE_INTENT_FAILED: 'Failed to create Stripe payment intent',
  STRIPE_CONFIRM_FAILED: 'Failed to confirm Stripe payment',
  STRIPE_REFUND_FAILED: 'Failed to process Stripe refund',

  // Iyzico
  IYZICO_GET_STATUS_FAILED: 'Failed to get Iyzico payment status',
  IYZICO_CREATE_PAYMENT_FAILED: 'Failed to create Iyzico payment',
  IYZICO_REFUND_FAILED: 'Failed to process Iyzico refund',

  // Webhooks
  WEBHOOK_INVALID_SIGNATURE: 'Invalid webhook signature',
  WEBHOOK_UNKNOWN_EVENT: 'Unknown or unhandled webhook event type',
  WEBHOOK_PROCESSING_FAILED: 'Failed to process webhook event',
  WEBHOOK_PAYMENT_NOT_FOUND: 'Payment not found for webhook event',
  STRIPE_WEBHOOK_VERIFICATION_FAILED: 'Stripe webhook signature verification failed',
  PAYPAL_WEBHOOK_VERIFICATION_FAILED: 'PayPal webhook verification failed',
  IYZICO_CALLBACK_VERIFICATION_FAILED: 'Iyzico callback verification failed',
  IYZICO_CALLBACK_TOKEN_MISSING: 'Iyzico callback token is missing',
} as const
