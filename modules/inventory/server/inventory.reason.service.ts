import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { MovementReason } from './entities/inventory_movement_reasons.entity'
import type {
  CreateMovementReasonDTO,
  UpdateMovementReasonDTO,
  GetMovementReasonsQuery,
} from './inventory.dto'
import { INVENTORY_MESSAGES } from './inventory.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped movement-reason CRUD (configurable master-data). */
export default class MovementReasonService {
  static async list(tenantId: string, query: GetMovementReasonsQuery): Promise<{ data: MovementReason[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(MovementReason).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, reasonId: string): Promise<MovementReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(MovementReason).findOne({ where: { tenantId, reasonId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateMovementReasonDTO): Promise<MovementReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(MovementReason)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[MovementReasonService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(INVENTORY_MESSAGES.REASON_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, reasonId: string, data: UpdateMovementReasonDTO): Promise<MovementReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(MovementReason)
    const row = await repo.findOne({ where: { tenantId, reasonId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, reasonId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(MovementReason)
    const row = await repo.findOne({ where: { tenantId, reasonId } })
    if (!row) throw new AppError(INVENTORY_MESSAGES.REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
