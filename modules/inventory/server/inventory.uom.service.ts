import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { UnitOfMeasure } from './entities/uoms.entity'
import type {
  CreateUnitOfMeasureDTO,
  UpdateUnitOfMeasureDTO,
  GetUnitOfMeasuresQuery,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped unit-of-measure CRUD (configurable master-data). */
export default class UnitOfMeasureService {
  static async list(tenantId: string, query: GetUnitOfMeasuresQuery): Promise<{ data: UnitOfMeasure[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(UnitOfMeasure).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, uomId: string): Promise<UnitOfMeasure> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(UnitOfMeasure).findOne({ where: { tenantId, uomId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.UOM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateUnitOfMeasureDTO): Promise<UnitOfMeasure> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(UnitOfMeasure)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[UnitOfMeasureService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.UOM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, uomId: string, data: UpdateUnitOfMeasureDTO): Promise<UnitOfMeasure> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(UnitOfMeasure)
    const row = await repo.findOne({ where: { tenantId, uomId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.UOM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, uomId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(UnitOfMeasure)
    const row = await repo.findOne({ where: { tenantId, uomId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.UOM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
