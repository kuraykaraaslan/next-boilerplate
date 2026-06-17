export {
  PaymentProviderEnum,
  PaymentCurrencyEnum,
  type PaymentProvider,
  type PaymentCurrency,
} from '@kuraykaraaslan/payment_core/server/payment_core.enums'

import { z } from 'zod'

export const SubscriptionStatusEnum = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED',
  'INCOMPLETE',
])
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>

export const BillingCycleEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
export type BillingCycle = z.infer<typeof BillingCycleEnum>

export const SubscriptionPlanStatusEnum = z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT'])
export type SubscriptionPlanStatus = z.infer<typeof SubscriptionPlanStatusEnum>

// Plan feature type is shared with the `tenant_subscription` module — both read the
// same `plan_features` table, so the value set must have a single source of truth.
// Re-exported (not redefined) to make the 4-vs-2 drift that previously broke plan
// reads structurally impossible. Canonical model: BOOLEAN flag | LIMIT quota.
export {
  PlanFeatureTypeEnum,
  type PlanFeatureType,
} from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.enums'
