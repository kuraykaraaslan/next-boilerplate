import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { GoodsReceipt } from './entities/goods_receipts.entity'
import type { CreateGoodsReceiptDTO, UpdateGoodsReceiptDTO, GetGoodsReceiptsQuery } from './procurement.dto'
import { PROCUREMENT_MESSAGES } from './procurement.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped goods receipt CRUD. */
export default class GoodsReceiptService {
  static async list(tenantId: string, query: GetGoodsReceiptsQuery): Promise<{ data: GoodsReceipt[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['number'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(GoodsReceipt).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, receiptId: string): Promise<GoodsReceipt> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(GoodsReceipt).findOne({ where: { tenantId, receiptId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.GOODS_RECEIPT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(GoodsReceipt)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[GoodsReceiptService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PROCUREMENT_MESSAGES.GOODS_RECEIPT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, receiptId: string, data: UpdateGoodsReceiptDTO): Promise<GoodsReceipt> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(GoodsReceipt)
    const row = await repo.findOne({ where: { tenantId, receiptId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.GOODS_RECEIPT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, receiptId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(GoodsReceipt)
    const row = await repo.findOne({ where: { tenantId, receiptId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.GOODS_RECEIPT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
