export const PAYMENT_MESSAGES = {
  // General
  PROVIDER_NOT_FOUND: 'Payment provider not found',
  PROVIDER_NOT_CONFIGURED: 'Payment provider not configured',
  GET_STATUS_FAILED: 'Failed to get payment status',
  INVALID_TOKEN: 'Invalid payment token',
  TRANSACTION_FAILED: 'Transaction failed',

  // PayPal
  PAYPAL_ACCESS_TOKEN_FAILED: 'Failed to obtain PayPal access token',
  PAYPAL_GET_STATUS_FAILED: 'Failed to get PayPal payment status',

  // Stripe
  STRIPE_GET_STATUS_FAILED: 'Failed to get Stripe payment status',

  // Iyzico
  IYZICO_GET_STATUS_FAILED: 'Failed to get Iyzico payment status',
} as const
