import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { ReturnRequest as ReturnRequestEntity } from './entities/return_request.entity'
import { ReturnItem as ReturnItemEntity } from './entities/return_item.entity'
import type { AddReturnLineDTO, UpdateReturnLineDTO, GetReturnLinesQuery } from './payment_return_rma.dto'
import { PAYMENT_RETURN_RMA_MESSAGES } from './payment_return_rma.messages'

/** Tenant-scoped return line items (ReturnItem) + parent refund-amount recompute. */
export default class PaymentReturnRmaLineService {
  /** Recompute refundAmount = sum(quantity*unitPrice) from lines and persist on the parent. */
  static async recompute(tenantId: string, returnRequestId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const lines = await ds.getRepository(ReturnItemEntity).find({ where: { tenantId, returnRequestId } })
    const total = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0)
    await ds.getRepository(ReturnRequestEntity).update({ tenantId, returnRequestId }, { refundAmount: total })
    return total
  }

  static async listByParent(
    tenantId: string,
    returnRequestId: string,
    query: GetReturnLinesQuery,
  ): Promise<{ data: ReturnItemEntity[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, returnRequestId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(ReturnItemEntity).findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async addLine(tenantId: string, returnRequestId: string, data: AddReturnLineDTO): Promise<ReturnItemEntity> {
    const ds = await tenantDataSourceFor(tenantId)
    const parent = await ds.getRepository(ReturnRequestEntity).findOne({ where: { tenantId, returnRequestId } })
    if (!parent) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(ReturnItemEntity)
    try {
      const amount = Number(data.quantity) * Number(data.unitPrice)
      const saved = await repo.save(repo.create({ tenantId, returnRequestId, ...data, amount }))
      await this.recompute(tenantId, returnRequestId)
      return saved
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[PaymentReturnRmaLineService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_LINE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string,
    returnRequestId: string,
    returnItemId: string,
    data: UpdateReturnLineDTO,
  ): Promise<ReturnItemEntity> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnItemEntity)
    const row = await repo.findOne({ where: { tenantId, returnRequestId, returnItemId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    row.amount = Number(row.quantity) * Number(row.unitPrice)
    const saved = await repo.save(row)
    await this.recompute(tenantId, returnRequestId)
    return saved
  }

  static async deleteLine(tenantId: string, returnRequestId: string, returnItemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnItemEntity)
    const row = await repo.findOne({ where: { tenantId, returnRequestId, returnItemId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await this.recompute(tenantId, returnRequestId)
  }
}
