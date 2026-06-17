import { z } from 'zod'
import { CurrencyCodeEnum } from '@kuraykaraaslan/common'
import { PaymentProviderEnum } from '@kuraykaraaslan/payment_core/server/payment_core.enums'
import {
  SubscriptionStatusEnum, BillingCycleEnum,
  SubscriptionPlanStatusEnum, PlanFeatureTypeEnum,
} from './payment_subscription.enums'

export const PlanFeatureSchema = z.object({
  featureId: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  type: PlanFeatureTypeEnum,
  value: z.string(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type PlanFeature = z.infer<typeof PlanFeatureSchema>

export const SubscriptionPlanSchema = z.object({
  planId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  interval: BillingCycleEnum,
  trialDays: z.coerce.number().int(),
  status: SubscriptionPlanStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>

export const PlanProductSummarySchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  currency: CurrencyCodeEnum,
  basePrice: z.coerce.number(),
  shortDescription: z.string().nullable(),
  status: z.string(),
})
export type PlanProductSummary = z.infer<typeof PlanProductSummarySchema>

export const PlanWithProductSchema = SubscriptionPlanSchema.extend({
  product: PlanProductSummarySchema,
})
export type PlanWithProduct = z.infer<typeof PlanWithProductSchema>

export const PlanWithFeaturesSchema = SubscriptionPlanSchema.extend({
  product: PlanProductSummarySchema,
  features: z.array(PlanFeatureSchema),
})
export type PlanWithFeatures = z.infer<typeof PlanWithFeaturesSchema>

export const SubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  planId: z.string().uuid(),
  provider: PaymentProviderEnum,
  providerSubscriptionId: z.string().nullable(),
  providerCustomerId: z.string().nullable(),
  status: SubscriptionStatusEnum,
  billingCycle: BillingCycleEnum,
  amount: z.number(),
  currency: CurrencyCodeEnum,
  trialEndsAt: z.date().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  cancellationReason: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  pausedAt: z.date().nullable(),
  pausedUntil: z.date().nullable(),
  pastDueCount: z.number().int().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>

export const SubscriptionWithPlanSchema = SubscriptionSchema.omit({ deletedAt: true }).extend({
  plan: PlanWithFeaturesSchema,
})
export type SubscriptionWithPlan = z.infer<typeof SubscriptionWithPlanSchema>

export const ProrationPreviewSchema = z.object({
  unusedCredit: z.number(),
  newCycleCharge: z.number(),
  immediateCharge: z.number(),
  currency: CurrencyCodeEnum,
  prorationDate: z.date(),
})
export type ProrationPreview = z.infer<typeof ProrationPreviewSchema>
