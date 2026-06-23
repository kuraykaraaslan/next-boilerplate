import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { PurchaseOrder } from './entities/purchase_orders.entity'
import type { CreatePurchaseOrderDTO, UpdatePurchaseOrderDTO, GetPurchaseOrdersQuery } from './procurement.dto'
import { PurchaseOrderLine } from './entities/purchase_order_lines.entity'
import { PROCUREMENT_MESSAGES } from './procurement.messages'
import type { PurchaseOrderStatus } from './procurement.enums'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

type Transition = { action: string; from: PurchaseOrderStatus[]; to: PurchaseOrderStatus }
const TRANSITIONS: Record<string, Transition> = {
  order:   { action: 'order',   from: ['DRAFT'],            to: 'ORDERED' },
  receive: { action: 'receive', from: ['ORDERED'],          to: 'RECEIVED' },
  cancel:  { action: 'cancel',  from: ['DRAFT', 'ORDERED'], to: 'CANCELLED' },
}

/** Tenant-scoped purchase order CRUD + line totals + status workflow. */
export default class PurchaseOrderService {
  static async list(tenantId: string, query: GetPurchaseOrdersQuery): Promise<{ data: PurchaseOrder[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['number'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(PurchaseOrder).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrder> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(PurchaseOrder).findOne({ where: { tenantId, purchaseOrderId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrder)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[PurchaseOrderService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, purchaseOrderId: string, data: UpdatePurchaseOrderDTO): Promise<PurchaseOrder> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrder)
    const row = await repo.findOne({ where: { tenantId, purchaseOrderId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    await repo.save(row)
    // Recompute total from lines on every document save.
    return this.recomputeTotals(tenantId, purchaseOrderId)
  }

  /** Recompute the purchase order total from its lines and persist it. */
  static async recomputeTotals(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrder> {
    const ds = await tenantDataSourceFor(tenantId)
    const orderRepo = ds.getRepository(PurchaseOrder)
    const order = await orderRepo.findOne({ where: { tenantId, purchaseOrderId } })
    if (!order) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const lines = await ds.getRepository(PurchaseOrderLine).find({ where: { tenantId, purchaseOrderId } })
    order.total = Number(lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0).toFixed(2))
    return orderRepo.save(order)
  }

  /** Apply a status-workflow transition (order/receive/cancel). */
  static async transition(tenantId: string, purchaseOrderId: string, action: string): Promise<PurchaseOrder> {
    const t = TRANSITIONS[action]
    if (!t) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrder)
    const row = await repo.findOne({ where: { tenantId, purchaseOrderId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!t.from.includes(row.status as PurchaseOrderStatus)) {
      throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_INVALID_TRANSITION, 409, ErrorCode.CONFLICT)
    }
    row.status = t.to
    if (t.to === 'ORDERED') row.orderedAt = new Date()
    return repo.save(row)
  }

  static async delete(tenantId: string, purchaseOrderId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrder)
    const row = await repo.findOne({ where: { tenantId, purchaseOrderId } })
    if (!row) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
