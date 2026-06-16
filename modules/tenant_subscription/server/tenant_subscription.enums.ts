import { z } from 'zod'

// Subscription Plan Status - matches Prisma SubscriptionPlanStatus enum
export const SubscriptionPlanStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])

// Subscription Status - matches Prisma SubscriptionStatus enum
export const SubscriptionStatusEnum = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING'])

// Billing Interval - recurrence frequency of a plan / subscription
export const BillingIntervalEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])

// Plan Feature Type — canonical single source of truth for the `plan_features.type`
// column. The admin plans UI, this module's feature-access engine, and the parallel
// `payment_subscription` module (which re-exports this) all read the shared
// `plan_features` table, so the value set MUST be defined in exactly one place.
// Two types only: BOOLEAN (on/off flag) and LIMIT (numeric quota).
export const PlanFeatureTypeEnum = z.enum(['BOOLEAN', 'LIMIT'])

// Type exports
export type SubscriptionPlanStatus = z.infer<typeof SubscriptionPlanStatusEnum>
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>
export type BillingInterval = z.infer<typeof BillingIntervalEnum>
export type PlanFeatureType = z.infer<typeof PlanFeatureTypeEnum>
