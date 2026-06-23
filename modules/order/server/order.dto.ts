import { z } from 'zod'
import { OrderStatusEnum } from './order.enums'

export const CreateOrderDTO = z.object({
  number: z.string().min(1),
  customerId: z.string().optional(),
  status: OrderStatusEnum.default('DRAFT'),
  currency: z.string().optional(),
  reference: z.string().optional(),
  total: z.coerce.number().default(0),
})
export type CreateOrderDTO = z.infer<typeof CreateOrderDTO>

export const UpdateOrderDTO = CreateOrderDTO.partial()
export type UpdateOrderDTO = z.infer<typeof UpdateOrderDTO>

export const GetOrdersQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  status: OrderStatusEnum.optional(),
  search: z.string().optional(),
})
export type GetOrdersQuery = z.infer<typeof GetOrdersQuery>

export const CreateOrderLineDTO = z.object({
  orderId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().default(0),
})
export type CreateOrderLineDTO = z.infer<typeof CreateOrderLineDTO>

/** Line payload from the panel (orderId comes from the route param). */
export const AddOrderLineDTO = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().default(0),
})
export type AddOrderLineDTO = z.infer<typeof AddOrderLineDTO>

export const UpdateOrderLineDTO = AddOrderLineDTO.partial()
export type UpdateOrderLineDTO = z.infer<typeof UpdateOrderLineDTO>

export const GetOrderLinesQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(100),
  search: z.string().optional(),
})
export type GetOrderLinesQuery = z.infer<typeof GetOrderLinesQuery>

export const CreateOrderStatusEventDTO = z.object({
  orderId: z.string().uuid(),
  status: OrderStatusEnum,
  note: z.string().optional(),
})
export type CreateOrderStatusEventDTO = z.infer<typeof CreateOrderStatusEventDTO>
