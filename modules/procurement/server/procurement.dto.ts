import { z } from 'zod'
import { PurchaseOrderStatusEnum, GoodsReceiptStatusEnum } from './procurement.enums'

// ============================================================================
// PurchaseOrder DTOs
// ============================================================================

export const CreatePurchaseOrderDTO = z.object({
  supplierId: z.string().min(1),
  number: z.string().min(1),
  status: PurchaseOrderStatusEnum.default('DRAFT'),
  currency: z.string().optional(),
  reference: z.string().optional(),
  total: z.coerce.number().optional(),
})
export type CreatePurchaseOrderDTO = z.infer<typeof CreatePurchaseOrderDTO>

// ----------------------------------------------------------------------------
// PurchaseOrderLine DTOs
// ----------------------------------------------------------------------------

export const CreatePurchaseOrderLineDTO = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().int().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
})
export type CreatePurchaseOrderLineDTO = z.infer<typeof CreatePurchaseOrderLineDTO>

export const UpdatePurchaseOrderLineDTO = CreatePurchaseOrderLineDTO.partial()
export type UpdatePurchaseOrderLineDTO = z.infer<typeof UpdatePurchaseOrderLineDTO>

export const UpdatePurchaseOrderDTO = CreatePurchaseOrderDTO.partial()
export type UpdatePurchaseOrderDTO = z.infer<typeof UpdatePurchaseOrderDTO>

export const GetPurchaseOrdersQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetPurchaseOrdersQuery = z.infer<typeof GetPurchaseOrdersQuery>

// ============================================================================
// GoodsReceipt DTOs
// ============================================================================

export const CreateGoodsReceiptDTO = z.object({
  purchaseOrderId: z.string().min(1),
  number: z.string().min(1),
  status: GoodsReceiptStatusEnum.default('DRAFT'),
})
export type CreateGoodsReceiptDTO = z.infer<typeof CreateGoodsReceiptDTO>

export const UpdateGoodsReceiptDTO = CreateGoodsReceiptDTO.partial()
export type UpdateGoodsReceiptDTO = z.infer<typeof UpdateGoodsReceiptDTO>

export const GetGoodsReceiptsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetGoodsReceiptsQuery = z.infer<typeof GetGoodsReceiptsQuery>
