import { z } from 'zod'
import {
  SubscriptionPlanStatusEnum,
  SubscriptionStatusEnum,
  BillingIntervalEnum,
  PlanFeatureTypeEnum,
} from './tenant_subscription.enums'

// Plan Feature Schema
export const PlanFeatureSchema = z.object({
  featureId: z.string().uuid(),
  planId: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  type: PlanFeatureTypeEnum,
  value: z.string(),
  sortOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Subscription Plan Schema
export const SubscriptionPlanSchema = z.object({
  planId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  currency: z.string().max(3),
  trialDays: z.number(),
  sortOrder: z.number(),
  isDefault: z.boolean(),
  status: SubscriptionPlanStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Plan with Features Schema
export const PlanWithFeaturesSchema = SubscriptionPlanSchema.extend({
  features: z.array(PlanFeatureSchema),
})

// Tenant Subscription Schema
export const TenantSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: SubscriptionStatusEnum,
  billingInterval: BillingIntervalEnum,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  trialEndsAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  gracePeriodEndsAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Grace Period Status
export const GracePeriodStatusSchema = z.object({
  inGrace: z.boolean(),
  gracePeriodEndsAt: z.date().nullable(),
  daysRemaining: z.number().nullable(),
})

// Tenant Subscription with Plan details
export const TenantSubscriptionWithPlanSchema = TenantSubscriptionSchema.extend({
  plan: PlanWithFeaturesSchema,
})

// Type exports
export type PlanFeature = z.infer<typeof PlanFeatureSchema>
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>
export type PlanWithFeatures = z.infer<typeof PlanWithFeaturesSchema>
export type TenantSubscription = z.infer<typeof TenantSubscriptionSchema>
export type TenantSubscriptionWithPlan = z.infer<typeof TenantSubscriptionWithPlanSchema>
export type GracePeriodStatus = z.infer<typeof GracePeriodStatusSchema>

// Feature Access Result
export type FeatureAccessResult =
  | {
      allowed: boolean
      featureKey: string
      type: 'BOOLEAN'
      limit: null
      unlimited: null
      current: null
    }
  | {
      allowed: boolean
      featureKey: string
      type: 'LIMIT'
      limit: number           // -1 means unlimited
      unlimited: boolean
      current: number | null  // null when currentCount not provided
      gracePercent: number    // 0 = hard limit
      effectiveLimit: number  // limit + grace ceiling (-1 when unlimited)
      inGrace: boolean        // true when limit < current <= effectiveLimit
    }
