import { z } from 'zod'

export const PurchaseOrderStatusEnum = z.enum(['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'])
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusEnum>

export const GoodsReceiptStatusEnum = z.enum(['DRAFT', 'RECEIVED', 'CANCELLED'])
export type GoodsReceiptStatus = z.infer<typeof GoodsReceiptStatusEnum>
