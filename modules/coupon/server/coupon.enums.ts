import { z } from 'zod'

export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT'])
export const CouponStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'ARCHIVED'])

export type DiscountType = z.infer<typeof DiscountTypeEnum>
export type CouponStatus = z.infer<typeof CouponStatusEnum>
