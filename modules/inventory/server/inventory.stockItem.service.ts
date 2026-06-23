import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { InventoryStockItem } from './entities/inventory_stock_items.entity'
import type {
  CreateInventoryStockItemDTO,
  UpdateInventoryStockItemDTO,
  GetInventoryStockItemsQuery,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped stock item CRUD. */
export default class InventoryStockItemService {
  static async list(tenantId: string, query: GetInventoryStockItemsQuery): Promise<{ data: InventoryStockItem[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['sku'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(InventoryStockItem).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, stockItemId: string): Promise<InventoryStockItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(InventoryStockItem).findOne({ where: { tenantId, stockItemId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.STOCK_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateInventoryStockItemDTO): Promise<InventoryStockItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryStockItem)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[InventoryStockItemService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.STOCK_ITEM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, stockItemId: string, data: UpdateInventoryStockItemDTO): Promise<InventoryStockItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryStockItem)
    const row = await repo.findOne({ where: { tenantId, stockItemId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.STOCK_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, stockItemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryStockItem)
    const row = await repo.findOne({ where: { tenantId, stockItemId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.STOCK_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
