export const SUBSCRIPTION_MESSAGES = {
  PLAN_NOT_FOUND: 'Subscription plan not found',
  PRODUCT_NOT_FOUND_FOR_PLAN: 'Product not found for plan',
  PLAN_REFERENCES_MISSING_PRODUCT: 'Plan references a missing product',
  PLAN_CREATE_FAILED: 'Failed to create subscription plan',
  PLAN_UPDATE_FAILED: 'Failed to update subscription plan',
  PLAN_DELETE_FAILED: 'Failed to delete subscription plan',
  PLAN_HAS_ACTIVE_SUBSCRIBERS: 'Cannot delete a plan with active subscribers',

  FEATURE_NOT_FOUND: 'Plan feature not found',
  FEATURE_CREATE_FAILED: 'Failed to create plan feature',
  FEATURE_UPDATE_FAILED: 'Failed to update plan feature',

  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  INVALID_USAGE_QUANTITY: 'Usage quantity must be positive',
  SUBSCRIPTION_CREATE_FAILED: 'Failed to create subscription',
  SUBSCRIPTION_UPDATE_FAILED: 'Failed to update subscription',
  SUBSCRIPTION_CANCEL_FAILED: 'Failed to cancel subscription',
  SUBSCRIPTION_ALREADY_CANCELLED: 'Subscription is already cancelled',
  SUBSCRIPTION_ALREADY_ACTIVE: 'Subscription is already active',
  SUBSCRIPTION_NOT_ACTIVE: 'Subscription is not active',
  SUBSCRIPTION_PAUSED: 'Subscription is currently paused',
  SUBSCRIPTION_ALREADY_EXPIRED: 'Subscription is already expired',
  SUBSCRIPTION_DELETE_FAILED: 'Failed to delete subscription',
  SUBSCRIPTION_EVENT_CREATE_FAILED: 'Failed to record subscription event',

  PRORATION_CALCULATE_FAILED: 'Failed to calculate proration',

  PROVIDER_SYNC_FAILED: 'Failed to sync subscription with payment provider',
  PROVIDER_CANCEL_FAILED: 'Failed to cancel subscription with payment provider',
  PROVIDER_PAUSE_FAILED: 'Failed to pause subscription with payment provider',

  WEBHOOK_PROCESSING_FAILED: 'Failed to process subscription webhook event',
  WEBHOOK_SUBSCRIPTION_NOT_FOUND: 'Subscription not found for webhook event',
} as const
