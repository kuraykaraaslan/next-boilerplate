import { z } from 'zod'
import {
  SubscriptionPlanStatusEnum,
  BillingIntervalEnum,
  PlanFeatureTypeEnum,
} from './tenant_subscription.enums'

// ============================================================================
// Plan DTOs
// ============================================================================

export const CreatePlanRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  interval: BillingIntervalEnum.default('MONTHLY'),
  trialDays: z.coerce.number().int().nonnegative().default(0),
  status: SubscriptionPlanStatusEnum.default('ACTIVE'),
})

export const UpdatePlanRequestSchema = z.object({
  productId: z.string().uuid().optional(),
  interval: BillingIntervalEnum.optional(),
  trialDays: z.coerce.number().int().nonnegative().optional(),
  status: SubscriptionPlanStatusEnum.optional(),
})

export const GetPlansQuerySchema = z.object({
  status: SubscriptionPlanStatusEnum.optional(),
  includeFeatures: z.boolean().default(false),
})

// ============================================================================
// Feature DTOs
// ============================================================================

export const CreateFeatureRequestSchema = z.object({
  key: z.string().min(1, 'Feature key is required'),
  label: z.string().min(1, 'Feature label is required'),
  type: PlanFeatureTypeEnum.default('BOOLEAN'),
  value: z.string().min(1, 'Feature value is required'),
  sortOrder: z.number().int().default(0),
})

export const UpdateFeatureRequestSchema = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  type: PlanFeatureTypeEnum.optional(),
  value: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
})

// ============================================================================
// Subscription DTOs
// ============================================================================

export const AssignSubscriptionRequestSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  /** Optional override; defaults to the plan's interval. */
  billingInterval: BillingIntervalEnum.optional(),
})

// ============================================================================
// Type Exports
// ============================================================================

export type CreatePlanDTO = z.infer<typeof CreatePlanRequestSchema>
export type UpdatePlanDTO = z.infer<typeof UpdatePlanRequestSchema>
export type GetPlansQuery = z.infer<typeof GetPlansQuerySchema>
export type CreateFeatureDTO = z.infer<typeof CreateFeatureRequestSchema>
export type UpdateFeatureDTO = z.infer<typeof UpdateFeatureRequestSchema>
export type AssignSubscriptionDTO = z.infer<typeof AssignSubscriptionRequestSchema>
