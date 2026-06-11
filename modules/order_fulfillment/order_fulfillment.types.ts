import { z } from 'zod'
import { FulfillmentStatusEnum, FulfillmentCarrierEnum } from './order_fulfillment.enums'

export const FulfillmentSchema = z.object({
  fulfillmentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  status: FulfillmentStatusEnum,
  carrier: FulfillmentCarrierEnum.nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shippingMethodId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  packedAt: z.date().nullable(),
  shippedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Fulfillment = z.infer<typeof FulfillmentSchema>

export const SafeFulfillmentSchema = FulfillmentSchema.omit({ deletedAt: true })
export type SafeFulfillment = z.infer<typeof SafeFulfillmentSchema>

export const FulfillmentItemSchema = z.object({
  fulfillmentItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fulfillmentId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  sku: z.string().nullable(),
  name: z.string(),
  quantity: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type FulfillmentItem = z.infer<typeof FulfillmentItemSchema>

export const FulfillmentEventSchema = z.object({
  fulfillmentEventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fulfillmentId: z.string().uuid(),
  status: FulfillmentStatusEnum,
  message: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
})
export type FulfillmentEvent = z.infer<typeof FulfillmentEventSchema>

export const FulfillmentWithItemsSchema = SafeFulfillmentSchema.extend({
  items: z.array(FulfillmentItemSchema),
  events: z.array(FulfillmentEventSchema),
})
export type FulfillmentWithItems = z.infer<typeof FulfillmentWithItemsSchema>
