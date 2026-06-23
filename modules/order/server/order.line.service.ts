import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Order } from './entities/orders.entity'
import { OrderLine } from './entities/order_lines.entity'
import type { AddOrderLineDTO, UpdateOrderLineDTO, GetOrderLinesQuery } from './order.dto'
import { ORDER_MESSAGES } from './order.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped order line items + parent total recompute. */
export default class OrderLineService {
  /** Recompute total = sum(quantity*unitPrice) from lines and persist on the parent. */
  static async recompute(tenantId: string, orderId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const lines = await ds.getRepository(OrderLine).find({ where: { tenantId, orderId } })
    const total = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0)
    await ds.getRepository(Order).update({ tenantId, orderId }, { total })
    return total
  }

  static async listByParent(
    tenantId: string,
    orderId: string,
    query: GetOrderLinesQuery,
  ): Promise<{ data: OrderLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, orderId }
    if (query.search) where['description'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(OrderLine).findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async addLine(tenantId: string, orderId: string, data: AddOrderLineDTO): Promise<OrderLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const orderRepo = ds.getRepository(Order)
    const order = await orderRepo.findOne({ where: { tenantId, orderId } })
    if (!order) throw new AppError(ORDER_MESSAGES.ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(OrderLine)
    try {
      const amount = Number(data.quantity) * Number(data.unitPrice)
      const saved = await repo.save(repo.create({ tenantId, orderId, ...data, amount }))
      await this.recompute(tenantId, orderId)
      return saved
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[OrderLineService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(ORDER_MESSAGES.ORDER_LINE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string,
    orderId: string,
    lineId: string,
    data: UpdateOrderLineDTO,
  ): Promise<OrderLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(OrderLine)
    const row = await repo.findOne({ where: { tenantId, orderId, lineId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    row.amount = Number(row.quantity) * Number(row.unitPrice)
    const saved = await repo.save(row)
    await this.recompute(tenantId, orderId)
    return saved
  }

  static async deleteLine(tenantId: string, orderId: string, lineId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(OrderLine)
    const row = await repo.findOne({ where: { tenantId, orderId, lineId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await this.recompute(tenantId, orderId)
  }
}
