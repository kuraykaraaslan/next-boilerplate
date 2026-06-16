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

// Subscription Plan Schema (billing recurrence binding for a Store Product)
export const SubscriptionPlanSchema = z.object({
  planId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  interval: BillingIntervalEnum,
  trialDays: z.coerce.number().int(),
  status: SubscriptionPlanStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Product summary attached to plans for admin/list display
export const PlanProductSummarySchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  currency: z.string().max(3),
  basePrice: z.coerce.number(),
  shortDescription: z.string().nullable(),
  status: z.string(),
})

// `product` is nullable: a plan keeps its productId even after the referenced
// store product is (soft-)deleted, so list/detail reads must tolerate the
// dangling reference instead of throwing. Admin UI renders a "No product"
// placeholder in that case.
export const PlanWithProductSchema = SubscriptionPlanSchema.extend({
  product: PlanProductSummarySchema.nullable(),
})

// Plan with Features (also embeds product)
export const PlanWithFeaturesSchema = SubscriptionPlanSchema.extend({
  product: PlanProductSummarySchema.nullable(),
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
export type PlanProductSummary = z.infer<typeof PlanProductSummarySchema>
export type PlanWithProduct = z.infer<typeof PlanWithProductSchema>
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
