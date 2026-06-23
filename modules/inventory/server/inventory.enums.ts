import { z } from 'zod'

export const InventoryMovementTypeEnum = z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'])
export type InventoryMovementType = z.infer<typeof InventoryMovementTypeEnum>

export const MovementReasonDirectionEnum = z.enum(['IN', 'OUT', 'BOTH'])
export type MovementReasonDirection = z.infer<typeof MovementReasonDirectionEnum>
