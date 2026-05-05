import { z } from 'zod'
import { DiscountTypeEnum, CouponStatusEnum } from './coupon.enums'

export const CouponSchema = z.object({
  couponId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discountType: DiscountTypeEnum,
  discountValue: z.number(),
  currency: z.string().nullable(),
  applicablePlanIds: z.array(z.string()).nullable(),
  applicableProviders: z.array(z.string()).nullable(),
  maxUses: z.number().nullable(),
  maxUsesPerTenant: z.number().nullable(),
  usedCount: z.number(),
  minimumAmount: z.number().nullable(),
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
