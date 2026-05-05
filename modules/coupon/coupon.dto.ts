import { z } from 'zod'
import { DiscountTypeEnum, CouponStatusEnum } from './coupon.enums'

export const CreateCouponRequestSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, _ or -')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: DiscountTypeEnum,
  discountValue: z
    .number()
    .positive()
    .refine((v) => true, { message: 'Discount value must be positive' }),
  currency: z.string().length(3).optional(),
  applicablePlanIds: z.array(z.string().uuid()).optional(),
  applicableProviders: z.array(z.string()).optional(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerTenant: z.number().int().positive().optional(),
  minimumAmount: z.number().nonnegative().optional(),
  status: CouponStatusEnum.default('ACTIVE'),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (d) => d.discountType === 'FIXED_AMOUNT' ? !!d.currency : true,
  { message: 'Currency is required for fixed amount discounts', path: ['currency'] }
).refine(
  (d) => d.discountType === 'PERCENTAGE' ? d.discountValue <= 100 : true,
  { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] }
)

export const UpdateCouponRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  discountType: DiscountTypeEnum.optional(),
  discountValue: z.number().positive().optional(),
  currency: z.string().length(3).nullable().optional(),
  applicablePlanIds: z.array(z.string().uuid()).nullable().optional(),
  applicableProviders: z.array(z.string()).nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerTenant: z.number().int().positive().nullable().optional(),
  minimumAmount: z.number().nonnegative().nullable().optional(),
  status: CouponStatusEnum.optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
})

export const GetCouponsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: CouponStatusEnum.optional(),
  search: z.string().optional(),
})

export const ValidateCouponRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  tenantId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  provider: z.string().optional(),
})

export const ApplyCouponRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  planId: z.string().uuid().optional(),
  provider: z.string().optional(),
})

export type CreateCouponDTO = z.infer<typeof CreateCouponRequestSchema>
export type UpdateCouponDTO = z.infer<typeof UpdateCouponRequestSchema>
export type GetCouponsQuery = z.infer<typeof GetCouponsQuerySchema>
export type ValidateCouponDTO = z.infer<typeof ValidateCouponRequestSchema>
export type ApplyCouponDTO = z.infer<typeof ApplyCouponRequestSchema>
