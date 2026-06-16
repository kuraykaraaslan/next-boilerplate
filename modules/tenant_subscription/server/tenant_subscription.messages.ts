export const SUBSCRIPTION_MESSAGES = {
  // Plan
  PLAN_NOT_FOUND: 'Subscription plan not found',
  PLAN_CREATE_FAILED: 'Failed to create subscription plan',
  PLAN_UPDATE_FAILED: 'Failed to update subscription plan',
  PLAN_DELETE_FAILED: 'Failed to delete subscription plan',
  PLAN_HAS_SUBSCRIPTIONS: 'Cannot delete plan with active subscriptions',
  PLAN_NAME_EXISTS: 'A plan with this name already exists',

  // Feature
  FEATURE_NOT_FOUND: 'Plan feature not found',
  FEATURE_CREATE_FAILED: 'Failed to create plan feature',
  FEATURE_UPDATE_FAILED: 'Failed to update plan feature',
  FEATURE_DELETE_FAILED: 'Failed to delete plan feature',
  FEATURE_KEY_EXISTS: 'A feature with this key already exists for this plan',

  // Subscription
  SUBSCRIPTION_NOT_FOUND: 'Tenant subscription not found',
  SUBSCRIPTION_ASSIGN_FAILED: 'Failed to assign subscription',
  PLATFORM_PLAN_ASSIGN_FAILED: 'Failed to assign platform plan to tenant',
  PLATFORM_PLAN_ONLY_ROOT: 'Only root-tenant plans can be assigned to other tenants',
  PLATFORM_PLAN_SELF_ASSIGN: 'Cannot assign a platform plan to the root tenant itself',
  PLATFORM_PLAN_MISSING_PRODUCT: 'Source platform plan references a deleted product',
  SUBSCRIPTION_CANCEL_FAILED: 'Failed to cancel subscription',
  SUBSCRIPTION_ALREADY_CANCELLED: 'Subscription is already cancelled',

  // Payment
  PAYMENT_INITIATION_FAILED: 'Failed to initiate subscription payment',
  PAYMENT_CONFIRMATION_FAILED: 'Failed to confirm subscription payment',
  PAYMENT_NOT_FOUND: 'Payment record not found',
  PAYMENT_ALREADY_PROCESSED: 'Payment has already been processed',
  PAYMENT_INVALID_STATUS: 'Invalid payment status',

  // Direct card payment
  CARD_PAYMENT_FAILED: 'Card payment could not be completed',
  CARD_DECLINED: 'Your card was declined',
  CARD_PROVIDER_UNSUPPORTED: 'The selected provider does not support paying by card on this form',

  // Feature Access
  FEATURE_ACCESS_DENIED: 'This feature is not available on your current plan',
  FEATURE_LIMIT_REACHED: 'You have reached the limit for this feature on your current plan',
  FEATURE_CHECK_FAILED: 'Failed to check feature access',

  // Grace Period
  GRACE_PERIOD_STARTED: 'Subscription grace period started',
  GRACE_PERIOD_EXPIRED: 'Subscription grace period has expired',
  GRACE_PERIOD_START_FAILED: 'Failed to start subscription grace period',
  SUBSCRIPTION_EXPIRED: 'Subscription has expired',
  SUBSCRIPTION_EXPIRE_FAILED: 'Failed to expire subscription',
  SUBSCRIPTION_NOT_PAST_DUE: 'Subscription is not in past-due state',

  // General
  FETCH_FAILED: 'Failed to fetch subscription data',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_REQUEST: 'Invalid request data',
  PRODUCT_NOT_FOUND: 'Product not found for plan',
  DEFAULT_PLAN_DELETED_PRODUCT: 'This plan references a deleted product and cannot be the default',
  DEFAULT_PLAN_NOT_FREE: 'Only a free plan (base price 0) can be set as the default plan',
} as const
