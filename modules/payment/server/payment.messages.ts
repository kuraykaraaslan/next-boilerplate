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
  INVALID_TRANSITION: 'Invalid payment status transition',

  // Payment method (configurable master-data)
  PAYMENT_METHOD_NOT_FOUND: 'Payment method not found',
  PAYMENT_METHOD_CREATE_FAILED: 'Failed to create payment method',

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
  IYZICO_BIN_CHECK_FAILED: 'Failed to check card BIN with Iyzico',
  IYZICO_DIRECT_PAYMENT_FAILED: 'Card payment could not be completed. Please try again.',
  IYZICO_PAYMENT_DECLINED: 'Your card was declined.',
  IYZICO_3DS_INIT_FAILED: 'Could not start 3D Secure verification. Please try again.',
  IYZICO_3DS_COMPLETE_FAILED: '3D Secure verification failed. Please try again.',
  IYZICO_3DS_NOT_VERIFIED: '3D Secure verification was not completed.',

  // Direct card charge (provider-agnostic)
  DIRECT_PAYMENT_NOT_SUPPORTED: 'The selected provider does not support direct card payments',

  // Alipay (China)
  ALIPAY_GET_STATUS_FAILED: 'Failed to get Alipay payment status',
  ALIPAY_CREATE_PAYMENT_FAILED: 'Failed to create Alipay payment',
  ALIPAY_REFUND_FAILED: 'Failed to process Alipay refund',
  ALIPAY_SIGNATURE_INVALID: 'Invalid Alipay signature',

  // WeChat Pay (China)
  WECHATPAY_GET_STATUS_FAILED: 'Failed to get WeChat Pay payment status',
  WECHATPAY_CREATE_PAYMENT_FAILED: 'Failed to create WeChat Pay payment',
  WECHATPAY_REFUND_FAILED: 'Failed to process WeChat Pay refund',
  WECHATPAY_SIGNATURE_INVALID: 'Invalid WeChat Pay signature',

  // YooKassa (Russia)
  YOOKASSA_GET_STATUS_FAILED: 'Failed to get YooKassa payment status',
  YOOKASSA_CREATE_PAYMENT_FAILED: 'Failed to create YooKassa payment',
  YOOKASSA_REFUND_FAILED: 'Failed to process YooKassa refund',

  // CloudPayments (Russia)
  CLOUDPAYMENTS_GET_STATUS_FAILED: 'Failed to get CloudPayments payment status',
  CLOUDPAYMENTS_CREATE_PAYMENT_FAILED: 'Failed to create CloudPayments payment',
  CLOUDPAYMENTS_REFUND_FAILED: 'Failed to process CloudPayments refund',

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
