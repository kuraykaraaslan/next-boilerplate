import { z } from 'zod'

export const ReturnTypeEnum = z.enum(['RETURN', 'EXCHANGE', 'REFUND'])
export type ReturnType = z.infer<typeof ReturnTypeEnum>

export const ReturnStatusEnum = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'REFUNDED',
  'COMPLETED',
  'CANCELLED',
])
export type ReturnStatus = z.infer<typeof ReturnStatusEnum>

export const ReturnItemConditionEnum = z.enum([
  'UNOPENED',
  'USED',
  'DAMAGED',
  'DEFECTIVE',
  'OTHER',
])
export type ReturnItemCondition = z.infer<typeof ReturnItemConditionEnum>
