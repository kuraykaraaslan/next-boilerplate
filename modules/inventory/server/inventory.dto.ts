import { z } from 'zod'
import { InventoryMovementTypeEnum, MovementReasonDirectionEnum } from './inventory.enums'

export const InventoryCountStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED'])
export type InventoryCountStatus = z.infer<typeof InventoryCountStatusEnum>

// ============================================================================
// Unit of Measure (config master-data)
// ============================================================================

export const CreateUnitOfMeasureDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  ratio: z.coerce.number().optional().default(1),
  isActive: z.boolean().optional().default(true),
})
export type CreateUnitOfMeasureDTO = z.infer<typeof CreateUnitOfMeasureDTO>

export const UpdateUnitOfMeasureDTO = CreateUnitOfMeasureDTO.partial()
export type UpdateUnitOfMeasureDTO = z.infer<typeof UpdateUnitOfMeasureDTO>

export const GetUnitOfMeasuresQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetUnitOfMeasuresQuery = z.infer<typeof GetUnitOfMeasuresQuery>

// ============================================================================
// Movement Reason (config master-data)
// ============================================================================

export const CreateMovementReasonDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  direction: MovementReasonDirectionEnum.optional().default('BOTH'),
})
export type CreateMovementReasonDTO = z.infer<typeof CreateMovementReasonDTO>

export const UpdateMovementReasonDTO = CreateMovementReasonDTO.partial()
export type UpdateMovementReasonDTO = z.infer<typeof UpdateMovementReasonDTO>

export const GetMovementReasonsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetMovementReasonsQuery = z.infer<typeof GetMovementReasonsQuery>

// ============================================================================
// Inventory Count Line
// ============================================================================

export const CreateInventoryCountLineDTO = z.object({
  stockItemId: z.string().min(1),
  systemQty: z.coerce.number().int().optional().default(0),
  countedQty: z.coerce.number().int().optional().default(0),
})
export type CreateInventoryCountLineDTO = z.infer<typeof CreateInventoryCountLineDTO>

export const UpdateInventoryCountLineDTO = CreateInventoryCountLineDTO.partial()
export type UpdateInventoryCountLineDTO = z.infer<typeof UpdateInventoryCountLineDTO>

// ============================================================================
// Warehouse
// ============================================================================

export const CreateInventoryWarehouseDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  isActive: z.boolean().optional().default(false),
})
export type CreateInventoryWarehouseDTO = z.infer<typeof CreateInventoryWarehouseDTO>

export const UpdateInventoryWarehouseDTO = CreateInventoryWarehouseDTO.partial()
export type UpdateInventoryWarehouseDTO = z.infer<typeof UpdateInventoryWarehouseDTO>

export const GetInventoryWarehousesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetInventoryWarehousesQuery = z.infer<typeof GetInventoryWarehousesQuery>

// ============================================================================
// Stock Item
// ============================================================================

export const CreateInventoryStockItemDTO = z.object({
  sku: z.string().min(1),
  warehouseId: z.string().min(1),
  uomId: z.string().optional(),
  quantity: z.coerce.number().int().optional().default(0),
  reserved: z.coerce.number().int().optional().default(0),
})
export type CreateInventoryStockItemDTO = z.infer<typeof CreateInventoryStockItemDTO>

export const UpdateInventoryStockItemDTO = CreateInventoryStockItemDTO.partial()
export type UpdateInventoryStockItemDTO = z.infer<typeof UpdateInventoryStockItemDTO>

export const GetInventoryStockItemsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetInventoryStockItemsQuery = z.infer<typeof GetInventoryStockItemsQuery>

// ============================================================================
// Movement
// ============================================================================

export const CreateInventoryMovementDTO = z.object({
  stockItemId: z.string().min(1),
  type: InventoryMovementTypeEnum.optional(),
  quantity: z.coerce.number().int(),
  reason: z.string().optional(),
})
export type CreateInventoryMovementDTO = z.infer<typeof CreateInventoryMovementDTO>

export const UpdateInventoryMovementDTO = CreateInventoryMovementDTO.partial()
export type UpdateInventoryMovementDTO = z.infer<typeof UpdateInventoryMovementDTO>

export const GetInventoryMovementsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
})
export type GetInventoryMovementsQuery = z.infer<typeof GetInventoryMovementsQuery>

// ============================================================================
// Count
// ============================================================================

export const CreateInventoryCountDTO = z.object({
  warehouseId: z.string().min(1),
  reference: z.string().optional(),
  status: InventoryCountStatusEnum.optional(),
})
export type CreateInventoryCountDTO = z.infer<typeof CreateInventoryCountDTO>

export const UpdateInventoryCountDTO = CreateInventoryCountDTO.partial()
export type UpdateInventoryCountDTO = z.infer<typeof UpdateInventoryCountDTO>

export const GetInventoryCountsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
})
export type GetInventoryCountsQuery = z.infer<typeof GetInventoryCountsQuery>
