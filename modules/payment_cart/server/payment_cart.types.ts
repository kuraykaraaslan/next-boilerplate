import { z } from 'zod'
import { CartStatusEnum } from './payment_cart.enums'

export const CartSchema = z.object({
  cartId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  guestToken: z.string().nullable(),
  status: CartStatusEnum,
  currency: z.string().length(3),
  couponCode: z.string().nullable(),
  subtotal: z.number().nullable(),
  discountTotal: z.number().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Cart = z.infer<typeof CartSchema>

export const SafeCartSchema = CartSchema.omit({ deletedAt: true })
export type SafeCart = z.infer<typeof SafeCartSchema>

export const CartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  cartId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  sku: z.string().nullable(),
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type CartItem = z.infer<typeof CartItemSchema>

export const CartTotalsSchema = z.object({
  subtotal: z.number(),
  discountTotal: z.number(),
  total: z.number(),
  itemCount: z.number().int(),
})
export type CartTotals = z.infer<typeof CartTotalsSchema>

export const CartWithItemsSchema = SafeCartSchema.extend({
  items: z.array(CartItemSchema),
  itemCount: z.number().int(),
  total: z.number(),
})
export type CartWithItems = z.infer<typeof CartWithItemsSchema>
