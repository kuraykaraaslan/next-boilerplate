import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { PurchaseOrder } from './entities/purchase_orders.entity'
import { PurchaseOrderLine } from './entities/purchase_order_lines.entity'
import type { CreatePurchaseOrderLineDTO, UpdatePurchaseOrderLineDTO } from './procurement.dto'
import { PROCUREMENT_MESSAGES } from './procurement.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped purchase order line items + parent total recompute. */
export default class PurchaseOrderLineService {
  /** Recompute the parent purchase order total from its lines and persist it. */
  static async recomputeTotals(ds: DataSource, tenantId: string, purchaseOrderId: string): Promise<PurchaseOrder> {
    const orderRepo = ds.getRepository(PurchaseOrder)
    const order = await orderRepo.findOne({ where: { tenantId, purchaseOrderId } })
    if (!order) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const lines = await ds.getRepository(PurchaseOrderLine).find({ where: { tenantId, purchaseOrderId } })
    const total = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0)
    order.total = Number(total.toFixed(2))
    return orderRepo.save(order)
  }

  private static async assertParent(ds: DataSource, tenantId: string, purchaseOrderId: string): Promise<void> {
    const order = await ds.getRepository(PurchaseOrder).findOne({ where: { tenantId, purchaseOrderId } })
    if (!order) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  }

  static async listByParent(tenantId: string, purchaseOrderId: string): Promise<{ data: PurchaseOrderLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    await this.assertParent(ds, tenantId, purchaseOrderId)
    const [data, total] = await ds.getRepository(PurchaseOrderLine).findAndCount({
      where: { tenantId, purchaseOrderId },
      order: { createdAt: 'ASC' },
    })
    return { data, total }
  }

  static async addLine(tenantId: string, purchaseOrderId: string, data: CreatePurchaseOrderLineDTO): Promise<PurchaseOrderLine> {
    const ds = await tenantDataSourceFor(tenantId)
    await this.assertParent(ds, tenantId, purchaseOrderId)
    const repo = ds.getRepository(PurchaseOrderLine)
    const line = await repo.save(repo.create({ tenantId, purchaseOrderId, ...data }))
    await this.recomputeTotals(ds, tenantId, purchaseOrderId)
    return line
  }

  static async updateLine(tenantId: string, purchaseOrderId: string, lineId: string, data: UpdatePurchaseOrderLineDTO): Promise<PurchaseOrderLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrderLine)
    const line = await repo.findOne({ where: { tenantId, purchaseOrderId, lineId } })
    if (!line) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(line, data)
    const saved = await repo.save(line)
    await this.recomputeTotals(ds, tenantId, purchaseOrderId)
    return saved
  }

  static async deleteLine(tenantId: string, purchaseOrderId: string, lineId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PurchaseOrderLine)
    const line = await repo.findOne({ where: { tenantId, purchaseOrderId, lineId } })
    if (!line) throw new AppError(PROCUREMENT_MESSAGES.PURCHASE_ORDER_LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(line)
    await this.recomputeTotals(ds, tenantId, purchaseOrderId)
  }
}
