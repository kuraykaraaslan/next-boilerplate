import { z } from 'zod'

export const OrderStatusEnum = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PAID',
  'FULFILLED',
  'CANCELLED',
  'REFUNDED',
])
export type OrderStatus = z.infer<typeof OrderStatusEnum>
