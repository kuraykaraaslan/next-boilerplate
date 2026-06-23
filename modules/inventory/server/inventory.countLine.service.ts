import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { InventoryCount } from './entities/inventory_counts.entity'
import { InventoryCountLine } from './entities/inventory_count_lines.entity'
import type {
  CreateInventoryCountLineDTO,
  UpdateInventoryCountLineDTO,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped count-line CRUD; recomputes parent count totals on every change. */
export default class InventoryCountLineService {
  /** Recompute and persist the parent count's computed totals from its lines. */
  static async recompute(tenantId: string, countId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const lineRepo = ds.getRepository(InventoryCountLine)
    const countRepo = ds.getRepository(InventoryCount)
    const lines = await lineRepo.find({ where: { tenantId, countId } })
    const lineCount = lines.length
    const totalDiff = lines.reduce((acc, l) => acc + (Number(l.countedQty) - Number(l.systemQty)), 0)
    const count = await countRepo.findOne({ where: { tenantId, countId } })
    if (!count) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    count.lineCount = lineCount
    count.totalDiff = totalDiff
    await countRepo.save(count)
  }

  static async listByParent(tenantId: string, countId: string): Promise<{ data: InventoryCountLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const [data, total] = await ds.getRepository(InventoryCountLine).findAndCount({
      where: { tenantId, countId },
      order: { createdAt: 'ASC' },
    })
    return { data, total }
  }

  static async addLine(tenantId: string, countId: string, data: CreateInventoryCountLineDTO): Promise<InventoryCountLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const countRepo = ds.getRepository(InventoryCount)
    const count = await countRepo.findOne({ where: { tenantId, countId } })
    if (!count) throw new AppError(INVENTORY_MESSAGES.COUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(InventoryCountLine)
    let line: InventoryCountLine
    try {
      line = await repo.save(repo.create({ tenantId, countId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[InventoryCountLineService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.COUNT_LINE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
    await this.recompute(tenantId, countId)
    return line
  }

  static async updateLine(tenantId: string, countId: string, countLineId: string, data: UpdateInventoryCountLineDTO): Promise<InventoryCountLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCountLine)
    const line = await repo.findOne({ where: { tenantId, countId, countLineId } })
    if (!line) throw new AppError(INVENTORY_MESSAGES.COUNT_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(line, data)
    const saved = await repo.save(line)
    await this.recompute(tenantId, countId)
    return saved
  }

  static async deleteLine(tenantId: string, countId: string, countLineId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryCountLine)
    const line = await repo.findOne({ where: { tenantId, countId, countLineId } })
    if (!line) throw new AppError(INVENTORY_MESSAGES.COUNT_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(line)
    await this.recompute(tenantId, countId)
  }
}
