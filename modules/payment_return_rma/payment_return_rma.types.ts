import { z } from 'zod'
import { ReturnTypeEnum, ReturnStatusEnum, ReturnItemConditionEnum } from './payment_return_rma.enums'

export const ReturnRequestSchema = z.object({
  returnRequestId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  rmaNumber: z.string(),
  type: ReturnTypeEnum,
  status: ReturnStatusEnum,
  reason: z.string().nullable(),
  customerNote: z.string().nullable(),
  adminNote: z.string().nullable(),
  refundAmount: z.number().nullable(),
  currency: z.string().max(3),
  metadata: z.record(z.string(), z.any()).nullable(),
  approvedAt: z.date().nullable(),
  receivedAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>

export const SafeReturnRequestSchema = ReturnRequestSchema.omit({ deletedAt: true })
export type SafeReturnRequest = z.infer<typeof SafeReturnRequestSchema>

export const ReturnItemSchema = z.object({
  returnItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  returnRequestId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  sku: z.string().nullable(),
  name: z.string(),
  quantity: z.number().int(),
  reason: z.string().nullable(),
  condition: ReturnItemConditionEnum.nullable(),
  createdAt: z.date(),
})
export type ReturnItem = z.infer<typeof ReturnItemSchema>

export const ReturnEventSchema = z.object({
  returnEventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  returnRequestId: z.string().uuid(),
  status: ReturnStatusEnum,
  message: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
})
export type ReturnEvent = z.infer<typeof ReturnEventSchema>

export const ReturnRequestWithItemsSchema = SafeReturnRequestSchema.extend({
  items: z.array(ReturnItemSchema),
  events: z.array(ReturnEventSchema),
})
export type ReturnRequestWithItems = z.infer<typeof ReturnRequestWithItemsSchema>
