import { z } from 'zod'
import { LoyaltyTransactionTypeEnum } from './payment_loyalty_points.enums'

// ============================================================================
// Points DTOs
// ============================================================================

export const EarnPointsDTO = z.object({
  userId: z.string().uuid(),
  points: z.number().int().positive(),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  applyMultiplier: z.boolean().default(true),
  expiresInDays: z.number().int().positive().optional(),
})
export type EarnPointsDTO = z.infer<typeof EarnPointsDTO>

export const RedeemPointsDTO = z.object({
  userId: z.string().uuid(),
  points: z.number().int().positive(),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
})
export type RedeemPointsDTO = z.infer<typeof RedeemPointsDTO>

export const AdjustPointsDTO = z.object({
  userId: z.string().uuid(),
  points: z.number().int(),
  reason: z.string(),
})
export type AdjustPointsDTO = z.infer<typeof AdjustPointsDTO>

export const GetTransactionsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: LoyaltyTransactionTypeEnum.optional(),
})
export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuery>

// ============================================================================
// Tier DTOs
// ============================================================================

export const CreateTierDTO = z.object({
  name: z.string(),
  code: z.string(),
  minPoints: z.number().int().nonnegative(),
  multiplier: z.number().positive().default(1.0),
  benefits: z.record(z.string(), z.any()).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})
export type CreateTierDTO = z.infer<typeof CreateTierDTO>

export const UpdateTierDTO = CreateTierDTO.partial()
export type UpdateTierDTO = z.infer<typeof UpdateTierDTO>
