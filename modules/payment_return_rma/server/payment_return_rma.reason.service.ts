import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { ReturnReason } from './entities/return_reason.entity'
import type { CreateReturnReasonDTO, UpdateReturnReasonDTO, GetReturnReasonsQuery } from './payment_return_rma.dto'
import { PAYMENT_RETURN_RMA_MESSAGES } from './payment_return_rma.messages'

/** Tenant-scoped return-reason (configurable master-data) CRUD. */
export default class PaymentReturnRmaReasonService {
  static async list(tenantId: string, query: GetReturnReasonsQuery): Promise<{ data: ReturnReason[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnReason)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, returnReasonId: string): Promise<ReturnReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(ReturnReason).findOne({ where: { tenantId, returnReasonId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateReturnReasonDTO): Promise<ReturnReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnReason)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      Logger.error(`[PaymentReturnRmaReasonService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_REASON_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, returnReasonId: string, data: UpdateReturnReasonDTO): Promise<ReturnReason> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnReason)
    const row = await repo.findOne({ where: { tenantId, returnReasonId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, returnReasonId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnReason)
    const row = await repo.findOne({ where: { tenantId, returnReasonId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_REASON_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
