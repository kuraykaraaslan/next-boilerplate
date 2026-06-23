import { z } from 'zod'
import { OrderStatusEnum } from './order.enums'

// ============================================================================
// Order
// ============================================================================

export const OrderSchema = z.object({
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  number: z.string(),
  customerId: z.string().uuid().nullable(),
  status: OrderStatusEnum,
  currency: z.string().nullable(),
  total: z.number(),
  placedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Order = z.infer<typeof OrderSchema>

export const SafeOrderSchema = OrderSchema.omit({ deletedAt: true })
export type SafeOrder = z.infer<typeof SafeOrderSchema>

// ============================================================================
// OrderLine
// ============================================================================

export const OrderLineSchema = z.object({
  lineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type OrderLine = z.infer<typeof OrderLineSchema>

// ============================================================================
// OrderStatusEvent
// ============================================================================

export const OrderStatusEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  status: OrderStatusEnum,
  note: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type OrderStatusEvent = z.infer<typeof OrderStatusEventSchema>
