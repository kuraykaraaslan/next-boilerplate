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
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  monthlyPrice: z.number().nonnegative('Monthly price must be non-negative'),
  yearlyPrice: z.number().nonnegative('Yearly price must be non-negative'),
  currency: z.string().max(3).default('USD'),
  trialDays: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  status: SubscriptionPlanStatusEnum.default('ACTIVE'),
})

export const UpdatePlanRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  monthlyPrice: z.number().nonnegative().optional(),
  yearlyPrice: z.number().nonnegative().optional(),
  currency: z.string().max(3).optional(),
  trialDays: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
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
  billingInterval: BillingIntervalEnum.default('MONTHLY'),
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
