import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { InventoryWarehouse } from './entities/inventory_warehouses.entity'
import type {
  CreateInventoryWarehouseDTO,
  UpdateInventoryWarehouseDTO,
  GetInventoryWarehousesQuery,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped warehouse CRUD. */
export default class InventoryWarehouseService {
  static async list(tenantId: string, query: GetInventoryWarehousesQuery): Promise<{ data: InventoryWarehouse[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(InventoryWarehouse).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, warehouseId: string): Promise<InventoryWarehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(InventoryWarehouse).findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateInventoryWarehouseDTO): Promise<InventoryWarehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryWarehouse)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[InventoryWarehouseService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.WAREHOUSE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, warehouseId: string, data: UpdateInventoryWarehouseDTO): Promise<InventoryWarehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryWarehouse)
    const row = await repo.findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, warehouseId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(InventoryWarehouse)
    const row = await repo.findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
