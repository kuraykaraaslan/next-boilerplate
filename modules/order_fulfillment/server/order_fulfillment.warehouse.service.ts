import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { Warehouse as WarehouseEntity } from './entities/warehouse.entity'
import { WarehouseSchema, type Warehouse } from './order_fulfillment.types'
import type { CreateWarehouseDTO, UpdateWarehouseDTO } from './order_fulfillment.dto'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

/** Tenant warehouse / fulfillment-location registry. */
export default class OrderFulfillmentWarehouseService {

  static async create(tenantId: string, dto: CreateWarehouseDTO): Promise<Warehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WarehouseEntity)
    const clash = await repo.findOne({ where: { tenantId, code: dto.code } })
    if (clash) throw new AppError(ORDER_FULFILLMENT_MESSAGES.WAREHOUSE_CODE_TAKEN, 409, ErrorCode.CONFLICT)
    // A newly-flagged default demotes any existing default.
    if (dto.isDefault) await repo.update({ tenantId, isDefault: true }, { isDefault: false })
    const saved = await repo.save(repo.create({ tenantId, ...dto, country: dto.country.toUpperCase() }))
    return WarehouseSchema.parse(saved)
  }

  static async update(tenantId: string, warehouseId: string, dto: UpdateWarehouseDTO): Promise<Warehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WarehouseEntity)
    const row = await repo.findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (dto.isDefault) await repo.update({ tenantId, isDefault: true }, { isDefault: false })
    Object.assign(row, dto, dto.country ? { country: dto.country.toUpperCase() } : {})
    const saved = await repo.save(row)
    return WarehouseSchema.parse(saved)
  }

  static async list(tenantId: string, opts?: { activeOnly?: boolean }): Promise<Warehouse[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (opts?.activeOnly) where.isActive = true
    const rows = await ds.getRepository(WarehouseEntity).find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } })
    return rows.map((r) => WarehouseSchema.parse(r))
  }

  static async getById(tenantId: string, warehouseId: string): Promise<Warehouse> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(WarehouseEntity).findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return WarehouseSchema.parse(row)
  }

  /** Resolve the tenant's default warehouse (first active fallback). */
  static async getDefault(tenantId: string): Promise<Warehouse | null> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WarehouseEntity)
    const def = await repo.findOne({ where: { tenantId, isDefault: true, isActive: true } })
      ?? await repo.findOne({ where: { tenantId, isActive: true }, order: { sortOrder: 'ASC' } })
    return def ? WarehouseSchema.parse(def) : null
  }

  static async delete(tenantId: string, warehouseId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WarehouseEntity)
    const row = await repo.findOne({ where: { tenantId, warehouseId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.WAREHOUSE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softDelete({ tenantId, warehouseId })
  }
}
