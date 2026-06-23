import { z } from 'zod'
import { PurchaseOrderStatusEnum } from './procurement.enums'

// ============================================================================
// PurchaseOrder
// ============================================================================

export const PurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  number: z.string(),
  status: PurchaseOrderStatusEnum,
  currency: z.string().nullable(),
  total: z.number(),
  orderedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>

export const SafePurchaseOrderSchema = PurchaseOrderSchema.omit({ deletedAt: true })
export type SafePurchaseOrder = z.infer<typeof SafePurchaseOrderSchema>

// ============================================================================
// PurchaseOrderLine
// ============================================================================

export const PurchaseOrderLineSchema = z.object({
  lineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>

// ============================================================================
// GoodsReceipt
// ============================================================================

export const GoodsReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  tenantId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  number: z.string(),
  status: z.string(),
  receivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>

export const SafeGoodsReceiptSchema = GoodsReceiptSchema.omit({ deletedAt: true })
export type SafeGoodsReceipt = z.infer<typeof SafeGoodsReceiptSchema>

// ============================================================================
// GoodsReceiptLine
// ============================================================================

export const GoodsReceiptLineSchema = z.object({
  lineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  receiptId: z.string().uuid(),
  purchaseOrderLineId: z.string().uuid().nullable(),
  quantity: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type GoodsReceiptLine = z.infer<typeof GoodsReceiptLineSchema>
