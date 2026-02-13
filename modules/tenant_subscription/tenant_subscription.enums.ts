import { z } from 'zod'

// Subscription Plan Status - matches Prisma SubscriptionPlanStatus enum
export const SubscriptionPlanStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])

// Subscription Status - matches Prisma SubscriptionStatus enum
export const SubscriptionStatusEnum = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIALING'])

// Billing Interval - matches Prisma BillingInterval enum
export const BillingIntervalEnum = z.enum(['MONTHLY', 'YEARLY'])

// Plan Feature Type - matches Prisma PlanFeatureType enum
export const PlanFeatureTypeEnum = z.enum(['BOOLEAN', 'LIMIT'])

// Type exports
export type SubscriptionPlanStatus = z.infer<typeof SubscriptionPlanStatusEnum>
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>
export type BillingInterval = z.infer<typeof BillingIntervalEnum>
export type PlanFeatureType = z.infer<typeof PlanFeatureTypeEnum>
