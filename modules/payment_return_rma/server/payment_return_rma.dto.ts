import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@kuraykaraaslan/common'
import { ReturnTypeEnum, ReturnStatusEnum, ReturnItemConditionEnum } from './payment_return_rma.enums'

// ============================================================================
// Return item input
// ============================================================================

export const ReturnItemInputSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
  reason: z.string().optional(),
  condition: ReturnItemConditionEnum.optional(),
})
export type ReturnItemInput = z.infer<typeof ReturnItemInputSchema>

// ============================================================================
// Return request DTOs
// ============================================================================

export const CreateReturnDTO = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  type: ReturnTypeEnum.default('RETURN'),
  reason: z.string().optional(),
  customerNote: z.string().optional(),
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
  /** Purchase date, from the order/payment — used for return-window eligibility. */
  purchasedAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  items: z.array(ReturnItemInputSchema).min(1),
})
export type CreateReturnDTO = z.infer<typeof CreateReturnDTO>

export const UpdateReturnDTO = z.object({
  adminNote: z.string().optional(),
  refundAmount: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateReturnDTO = z.infer<typeof UpdateReturnDTO>

export const ModerateReturnDTO = z.object({
  note: z.string().optional(),
})
export type ModerateReturnDTO = z.infer<typeof ModerateReturnDTO>

export const RefundReturnDTO = z.object({
  refundAmount: z.number().nonnegative().optional(),
  note: z.string().optional(),
  /** Override / supply the payment to refund against (payment_sell). */
  paymentId: z.string().uuid().optional(),
  /** CASH (provider refund) | STORE_CREDIT | GIFT_CARD. Defaults to tenant policy. */
  refundMethod: z.enum(['CASH', 'STORE_CREDIT', 'GIFT_CARD']).optional(),
  /** Loyalty points earned on the original purchase to claw back on refund. */
  loyaltyPointsToReverse: z.number().int().nonnegative().optional(),
})
export type RefundReturnDTO = z.infer<typeof RefundReturnDTO>

export const GetReturnsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: ReturnStatusEnum.optional(),
  type: ReturnTypeEnum.optional(),
  search: z.string().optional(),
  rmaNumber: z.string().optional(),
})
export type GetReturnsQuery = z.infer<typeof GetReturnsQuery>

// ============================================================================
// Return line (ReturnItem) DTOs — child line panel CRUD
// ============================================================================

export const AddReturnLineDTO = z.object({
  orderItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
  reason: z.string().optional(),
  condition: ReturnItemConditionEnum.optional(),
})
export type AddReturnLineDTO = z.infer<typeof AddReturnLineDTO>

export const UpdateReturnLineDTO = AddReturnLineDTO.partial()
export type UpdateReturnLineDTO = z.infer<typeof UpdateReturnLineDTO>

export const GetReturnLinesQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(200),
  search: z.string().optional(),
})
export type GetReturnLinesQuery = z.infer<typeof GetReturnLinesQuery>

// ============================================================================
// ReturnReason DTOs (configurable master-data)
// ============================================================================

export const CreateReturnReasonDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().optional().default(false),
})
export type CreateReturnReasonDTO = z.infer<typeof CreateReturnReasonDTO>

export const UpdateReturnReasonDTO = CreateReturnReasonDTO.partial()
export type UpdateReturnReasonDTO = z.infer<typeof UpdateReturnReasonDTO>

export const GetReturnReasonsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetReturnReasonsQuery = z.infer<typeof GetReturnReasonsQuery>
