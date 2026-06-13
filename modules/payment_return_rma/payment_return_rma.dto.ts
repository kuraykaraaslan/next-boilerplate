import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@/modules/common'
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
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: ReturnStatusEnum.optional(),
  type: ReturnTypeEnum.optional(),
  rmaNumber: z.string().optional(),
})
export type GetReturnsQuery = z.infer<typeof GetReturnsQuery>
