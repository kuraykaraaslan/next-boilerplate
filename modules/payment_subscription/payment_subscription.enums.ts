export {
  PaymentProviderEnum,
  PaymentCurrencyEnum,
  type PaymentProvider,
  type PaymentCurrency,
} from '../payment_core/payment_core.enums'

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

export const BillingCycleEnum = z.enum(['MONTHLY', 'YEARLY', 'QUARTERLY', 'WEEKLY'])
export type BillingCycle = z.infer<typeof BillingCycleEnum>

export const SubscriptionPlanStatusEnum = z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT'])
export type SubscriptionPlanStatus = z.infer<typeof SubscriptionPlanStatusEnum>

export const PlanFeatureTypeEnum = z.enum(['BOOLEAN', 'NUMBER', 'TEXT', 'LIMIT'])
export type PlanFeatureType = z.infer<typeof PlanFeatureTypeEnum>
