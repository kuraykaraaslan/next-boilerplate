import { z } from 'zod'
import { FulfillmentStatusEnum, FulfillmentCarrierEnum } from './order_fulfillment.enums'

// ============================================================================
// Fulfillment DTOs
// ============================================================================

export const FulfillmentItemInputSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive().default(1),
})
export type FulfillmentItemInput = z.infer<typeof FulfillmentItemInputSchema>

export const CreateFulfillmentDTO = z.object({
  orderId: z.string().uuid(),
  carrier: FulfillmentCarrierEnum.optional(),
  shippingMethodId: z.string().uuid().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  items: z.array(FulfillmentItemInputSchema).min(1),
})
export type CreateFulfillmentDTO = z.infer<typeof CreateFulfillmentDTO>

export const UpdateFulfillmentDTO = z.object({
  carrier: FulfillmentCarrierEnum.optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateFulfillmentDTO = z.infer<typeof UpdateFulfillmentDTO>

export const AddTrackingDTO = z.object({
  carrier: FulfillmentCarrierEnum,
  trackingNumber: z.string(),
  trackingUrl: z.string().url().optional(),
})
export type AddTrackingDTO = z.infer<typeof AddTrackingDTO>

export const UpdateStatusDTO = z.object({
  status: FulfillmentStatusEnum,
  message: z.string().optional(),
})
export type UpdateStatusDTO = z.infer<typeof UpdateStatusDTO>

export const GetFulfillmentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  status: FulfillmentStatusEnum.optional(),
  carrier: FulfillmentCarrierEnum.optional(),
  trackingNumber: z.string().optional(),
})
export type GetFulfillmentsQuery = z.infer<typeof GetFulfillmentsQuery>
