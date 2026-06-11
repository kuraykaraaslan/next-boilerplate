import { z } from 'zod'
import { LoyaltyTransactionTypeEnum } from './payment_loyalty_points.enums'

export const LoyaltyAccountSchema = z.object({
  loyaltyAccountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  balance: z.number().int(),
  lifetimePoints: z.number().int(),
  tier: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type LoyaltyAccount = z.infer<typeof LoyaltyAccountSchema>

export const LoyaltyTransactionSchema = z.object({
  loyaltyTransactionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  userId: z.string().uuid(),
  type: LoyaltyTransactionTypeEnum,
  points: z.number().int(),
  reason: z.string().nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  balanceAfter: z.number().int(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
})
export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>

export const LoyaltyTierSchema = z.object({
  loyaltyTierId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  minPoints: z.number().int(),
  multiplier: z.number(),
  benefits: z.record(z.string(), z.any()).nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type LoyaltyTier = z.infer<typeof LoyaltyTierSchema>

export const LoyaltyAccountWithTierSchema = LoyaltyAccountSchema.extend({
  tierDetail: LoyaltyTierSchema.nullable(),
})
export type LoyaltyAccountWithTier = z.infer<typeof LoyaltyAccountWithTierSchema>
