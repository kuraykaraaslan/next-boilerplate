import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Order } from './entities/orders.entity'
import { OrderLine } from './entities/order_lines.entity'
import { OrderStatusEvent } from './entities/order_status_events.entity'
import type { CreateOrderDTO, UpdateOrderDTO, GetOrdersQuery } from './order.dto'
import type { OrderStatus } from './order.enums'
import { ORDER_MESSAGES } from './order.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

type TransitionDef = { from: OrderStatus[]; to: OrderStatus }
const TRANSITIONS: Record<string, TransitionDef> = {
  confirm: { from: ['DRAFT'], to: 'CONFIRMED' },
  fulfill: { from: ['CONFIRMED', 'PAID'], to: 'FULFILLED' },
  cancel: { from: ['DRAFT', 'CONFIRMED', 'PAID'], to: 'CANCELLED' },
}

/** Tenant-scoped sales order CRUD. */
export default class OrderService {
  static async list(tenantId: string, query: GetOrdersQuery): Promise<{ data: Order[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Order)
    const where: Record<string, unknown> = { tenantId }
    if (query.status) where['status'] = query.status
    if (query.search) where['number'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, orderId: string): Promise<Order> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Order).findOne({ where: { tenantId, orderId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateOrderDTO): Promise<Order> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Order)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[OrderService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ORDER_MESSAGES.ORDER_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, orderId: string, data: UpdateOrderDTO): Promise<Order> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Order)
    const row = await repo.findOne({ where: { tenantId, orderId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    const saved = await repo.save(row)
    // Recompute the computed total from lines on every save.
    saved.total = await this.recomputeTotal(tenantId, orderId)
    await repo.update({ tenantId, orderId }, { total: saved.total })
    return saved
  }

  /** total = sum(quantity*unitPrice) over the order's lines. */
  static async recomputeTotal(tenantId: string, orderId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const lines = await ds.getRepository(OrderLine).find({ where: { tenantId, orderId } })
    return lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0)
  }

  static async delete(tenantId: string, orderId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Order)
    const row = await repo.findOne({ where: { tenantId, orderId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  /**
   * Apply a status-workflow transition: assert the current status is allowed,
   * set the new status, and append an OrderStatusEvent log row.
   */
  static async transition(tenantId: string, orderId: string, action: string): Promise<Order> {
    const def = TRANSITIONS[action]
    if (!def) throw new AppError(ORDER_MESSAGES.ORDER_TRANSITION_INVALID, 400, ErrorCode.VALIDATION_ERROR)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Order)
    const row = await repo.findOne({ where: { tenantId, orderId } })
    if (!row) throw new AppError(ORDER_MESSAGES.ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!def.from.includes(row.status as OrderStatus)) {
      throw new AppError(ORDER_MESSAGES.ORDER_TRANSITION_INVALID, 409, ErrorCode.CONFLICT)
    }
    if (action === 'confirm') row.placedAt = new Date()
    row.status = def.to
    const saved = await repo.save(row)
    const eventRepo = ds.getRepository(OrderStatusEvent)
    await eventRepo.save(eventRepo.create({
      tenantId, orderId, status: def.to, note: `Transition: ${action}`,
    }))
    return saved
  }

  static confirm(tenantId: string, orderId: string) { return this.transition(tenantId, orderId, 'confirm') }
  static fulfill(tenantId: string, orderId: string) { return this.transition(tenantId, orderId, 'fulfill') }
  static cancel(tenantId: string, orderId: string) { return this.transition(tenantId, orderId, 'cancel') }
}
