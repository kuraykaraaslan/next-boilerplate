import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { InventoryMovement } from './entities/inventory_movements.entity'
import type {
  CreateInventoryMovementDTO,
  UpdateInventoryMovementDTO,
  GetInventoryMovementsQuery,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped stock movement CRUD. */
export default class InventoryMovementService {
  static async list(tenantId: string, query: GetInventoryMovementsQuery): Promise<{ data: InventoryMovement[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    const [data, total] = await ds.getRepository(InventoryMovement).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, movementId: string): Promise<InventoryMovement> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(InventoryMovement).findOne({ where: { tenantId, movementId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.MOVEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateInventoryMovementDTO): Promise<InventoryMovement> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryMovement)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[InventoryMovementService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.MOVEMENT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, movementId: string, data: UpdateInventoryMovementDTO): Promise<InventoryMovement> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryMovement)
    const row = await repo.findOne({ where: { tenantId, movementId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.MOVEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, movementId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryMovement)
    const row = await repo.findOne({ where: { tenantId, movementId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.MOVEMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
