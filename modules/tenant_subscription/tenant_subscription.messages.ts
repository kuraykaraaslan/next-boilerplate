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
  SUBSCRIPTION_CANCEL_FAILED: 'Failed to cancel subscription',
  SUBSCRIPTION_ALREADY_CANCELLED: 'Subscription is already cancelled',

  // Payment
  PAYMENT_INITIATION_FAILED: 'Failed to initiate subscription payment',
  PAYMENT_CONFIRMATION_FAILED: 'Failed to confirm subscription payment',
  PAYMENT_NOT_FOUND: 'Payment record not found',
  PAYMENT_ALREADY_PROCESSED: 'Payment has already been processed',
  PAYMENT_INVALID_STATUS: 'Invalid payment status',

  // General
  FETCH_FAILED: 'Failed to fetch subscription data',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_REQUEST: 'Invalid request data',
} as const
