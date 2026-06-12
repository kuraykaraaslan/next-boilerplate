import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@/modules/common'
import { CartStatusEnum } from './payment_cart.enums'

export const AddCartItemDTO = z.object({
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type AddCartItemDTO = z.infer<typeof AddCartItemDTO>

export const UpdateCartItemDTO = z.object({
  quantity: z.number().int(),
})
export type UpdateCartItemDTO = z.infer<typeof UpdateCartItemDTO>

export const GetOrCreateCartDTO = z.object({
  userId: z.string().uuid().optional(),
  guestToken: z.string().optional(),
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
})
export type GetOrCreateCartDTO = z.infer<typeof GetOrCreateCartDTO>

export const ApplyCouponDTO = z.object({
  couponCode: z.string(),
})
export type ApplyCouponDTO = z.infer<typeof ApplyCouponDTO>

export const GetCartsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  status: CartStatusEnum.optional(),
})
export type GetCartsQuery = z.infer<typeof GetCartsQuery>
