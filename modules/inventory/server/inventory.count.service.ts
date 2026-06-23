import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { InventoryCount } from './entities/inventory_counts.entity'
import { InventoryCountLine } from './entities/inventory_count_lines.entity'
import { InventoryMovement } from './entities/inventory_movements.entity'
import type {
  CreateInventoryCountDTO,
  UpdateInventoryCountDTO,
  GetInventoryCountsQuery,
} from './inventory.dto'
import InventoryCountLineService from './inventory.countLine.service'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped inventory count CRUD. */
export default class InventoryCountService {
  static async list(tenantId: string, query: GetInventoryCountsQuery): Promise<{ data: InventoryCount[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    const [data, total] = await ds.getRepository(InventoryCount).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, countId: string): Promise<InventoryCount> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(InventoryCount).findOne({ where: { tenantId, countId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateInventoryCountDTO): Promise<InventoryCount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCount)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[InventoryCountService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.COUNT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, countId: string, data: UpdateInventoryCountDTO): Promise<InventoryCount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCount)
    const row = await repo.findOne({ where: { tenantId, countId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, countId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCount)
    const row = await repo.findOne({ where: { tenantId, countId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  // ==========================================================================
  // Status workflow
  // ==========================================================================

  /** OPEN -> IN_PROGRESS */
  static async start(tenantId: string, countId: string): Promise<InventoryCount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCount)
    const count = await repo.findOne({ where: { tenantId, countId } })
    if (!count) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (count.status !== 'OPEN') {
      throw new AppError(INVENTORY_MESSAGES.COUNT_INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    }
    count.status = 'IN_PROGRESS'
    return repo.save(count)
  }

  /**
   * IN_PROGRESS -> CLOSED. Validation: for each line create an InventoryMovement
   * (type ADJUSTMENT, quantity = countedQty - systemQty) before closing.
   */
  static async close(tenantId: string, countId: string): Promise<InventoryCount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCount)
    const count = await repo.findOne({ where: { tenantId, countId } })
    if (!count) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (count.status !== 'IN_PROGRESS') {
      throw new AppError(INVENTORY_MESSAGES.COUNT_INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    }
    await InventoryCountLineService.recompute(tenantId, countId)
    const lines = await ds.getRepository(InventoryCountLine).find({ where: { tenantId, countId } })
    const movementRepo = ds.getRepository(InventoryMovement)
    for (const line of lines) {
      const delta = Number(line.countedQty) - Number(line.systemQty)
      if (delta === 0) continue
      await movementRepo.save(movementRepo.create({
        tenantId,
        stockItemId: line.stockItemId,
        type: 'ADJUSTMENT',
        quantity: delta,
        reason: `Count ${countId}`,
      }))
    }
    count.status = 'CLOSED'
    count.countedAt = new Date()
    return repo.save(count)
  }
}
