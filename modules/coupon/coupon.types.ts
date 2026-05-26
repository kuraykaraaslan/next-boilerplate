import { z } from 'zod'
import { DiscountTypeEnum, CouponStatusEnum } from './coupon.enums'
import { CouponScopeSchema } from './coupon.dto'

export const CouponSchema = z.object({
  couponId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discountType: DiscountTypeEnum,
  discountValue: z.coerce.number(),
  currency: z.string().nullable(),
  scope: CouponScopeSchema.nullable(),
  maxUses: z.coerce.number().nullable(),
  maxUsesPerTenant: z.coerce.number().nullable(),
  usedCount: z.coerce.number(),
  status: CouponStatusEnum,
  startsAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CouponRedemptionSchema = z.object({
  redemptionId: z.string().uuid(),
  couponId: z.string(),
  couponCode: z.string(),
  tenantId: z.string().uuid(),
  paymentId: z.string().nullable(),
  userId: z.string().nullable(),
  discountAmount: z.number(),
  currency: z.string(),
  originalAmount: z.number(),
  finalAmount: z.number(),
  appliedAt: z.date(),
})

export const CouponValidationResultSchema = z.object({
  valid: z.boolean(),
  coupon: CouponSchema.optional(),
  discountAmount: z.number().optional(),
  finalAmount: z.number().optional(),
  message: z.string().optional(),
})

export type Coupon = z.infer<typeof CouponSchema>
export type CouponRedemption = z.infer<typeof CouponRedemptionSchema>
export type CouponValidationResult = z.infer<typeof CouponValidationResultSchema>
