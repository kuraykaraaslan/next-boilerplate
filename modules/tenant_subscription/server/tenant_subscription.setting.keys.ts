import { z } from 'zod'

// ============================================================================
// System Subscription Setting Keys
// ============================================================================

export const SubscriptionSettingKeySchema = z.enum([
  'subscriptionEnabled',
  'defaultPlanId',
  'trialEnabled',
  'defaultTrialDays',
  'subscriptionGracePeriodDays',
])
export type SubscriptionSettingKey = z.infer<typeof SubscriptionSettingKeySchema>
export const SUBSCRIPTION_KEYS = SubscriptionSettingKeySchema.options
