import { z } from 'zod'
import { PaymentProviderEnum, PaymentCurrencyEnum } from '../payment_core/payment_core.enums'
import {
  SubscriptionStatusEnum, BillingCycleEnum,
  SubscriptionPlanStatusEnum, PlanFeatureTypeEnum,
} from './payment_subscription.enums'

// ============================================================================
// Plan DTOs
// ============================================================================

export const CreatePlanDTO = z.object({
  productId: z.string().uuid(),
  interval: BillingCycleEnum.default('MONTHLY'),
  trialDays: z.coerce.number().int().nonnegative().default(0),
  status: SubscriptionPlanStatusEnum.default('ACTIVE'),
})
export type CreatePlanDTO = z.infer<typeof CreatePlanDTO>

export const UpdatePlanDTO = CreatePlanDTO.partial()
export type UpdatePlanDTO = z.infer<typeof UpdatePlanDTO>

export const GetPlansQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  status: SubscriptionPlanStatusEnum.optional(),
  includeFeatures: z.boolean().default(false),
})
export type GetPlansQuery = z.infer<typeof GetPlansQuery>

// ============================================================================
// Feature DTOs
// ============================================================================

export const CreateFeatureDTO = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(100),
  type: PlanFeatureTypeEnum.default('BOOLEAN'),
  value: z.string(),
  sortOrder: z.number().int().nonnegative().default(0),
})
export type CreateFeatureDTO = z.infer<typeof CreateFeatureDTO>

export const UpdateFeatureDTO = CreateFeatureDTO.partial()
export type UpdateFeatureDTO = z.infer<typeof UpdateFeatureDTO>

// ============================================================================
// Subscription DTOs
// ============================================================================

export const CreateSubscriptionDTO = z.object({
  userId: z.string().uuid().optional(),
  planId: z.string().uuid(),
  provider: PaymentProviderEnum,
  /** Optional override; defaults to the plan's interval. */
  billingCycle: BillingCycleEnum.optional(),
  currency: PaymentCurrencyEnum.optional(),
  providerSubscriptionId: z.string().optional(),
  providerCustomerId: z.string().optional(),
  trialEndsAt: z.date().optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  /** Exactly-once guard; auto-derived from providerSubscriptionId when omitted. */
  idempotencyKey: z.string().optional(),
})
export type CreateSubscriptionDTO = z.infer<typeof CreateSubscriptionDTO>

export const CancelSubscriptionDTO = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().optional(),
})
export type CancelSubscriptionDTO = z.infer<typeof CancelSubscriptionDTO>

export const PauseSubscriptionDTO = z.object({
  pausedUntil: z.date().optional(),
})
export type PauseSubscriptionDTO = z.infer<typeof PauseSubscriptionDTO>

export const ChangePlanDTO = z.object({
  newPlanId: z.string().uuid(),
  billingCycle: BillingCycleEnum.optional(),
  prorate: z.boolean().default(true),
})
export type ChangePlanDTO = z.infer<typeof ChangePlanDTO>

export const GetSubscriptionsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  status: SubscriptionStatusEnum.optional(),
  provider: PaymentProviderEnum.optional(),
})
export type GetSubscriptionsQuery = z.infer<typeof GetSubscriptionsQuery>
