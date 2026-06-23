import { z } from 'zod'
import { InventoryMovementTypeEnum } from './inventory.enums'

// ============================================================================
// Warehouse
// ============================================================================

export const InventoryWarehouseSchema = z.object({
  warehouseId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type InventoryWarehouse = z.infer<typeof InventoryWarehouseSchema>

// ============================================================================
// Location
// ============================================================================

export const InventoryLocationSchema = z.object({
  locationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type InventoryLocation = z.infer<typeof InventoryLocationSchema>

// ============================================================================
// Stock Item
// ============================================================================

export const InventoryStockItemSchema = z.object({
  stockItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  sku: z.string(),
  quantity: z.number().int(),
  reserved: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type InventoryStockItem = z.infer<typeof InventoryStockItemSchema>

// ============================================================================
// Movement
// ============================================================================

export const InventoryMovementSchema = z.object({
  movementId: z.string().uuid(),
  tenantId: z.string().uuid(),
  stockItemId: z.string().uuid(),
  type: InventoryMovementTypeEnum,
  quantity: z.number().int(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>

// ============================================================================
// Count
// ============================================================================

export const InventoryCountSchema = z.object({
  countId: z.string().uuid(),
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  status: z.string(),
  countedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type InventoryCount = z.infer<typeof InventoryCountSchema>
