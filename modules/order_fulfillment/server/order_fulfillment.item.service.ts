import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import redis from '@kuraykaraaslan/redis'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import { FulfillmentItem as FulfillmentItemEntity } from './entities/fulfillment_item.entity'
import { FulfillmentItemSchema, type FulfillmentItem } from './order_fulfillment.types'
import type { AddFulfillmentItemDTO, UpdateFulfillmentItemDTO, GetFulfillmentItemsQuery } from './order_fulfillment.dto'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { cacheKey } from './order_fulfillment.constants'
import { logEvent } from './order_fulfillment.events'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/**
 * Fulfillment line-item (child) CRUD. The fulfillment's "total" is its item
 * count, so each mutation records the new count on the event timeline and
 * invalidates the cached fulfillment.
 */
export default class OrderFulfillmentItemService {
  /** Sum of line quantities — the fulfillment's item-count "total". */
  static async itemCount(tenantId: string, fulfillmentId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const lines = await ds.getRepository(FulfillmentItemEntity).find({ where: { tenantId, fulfillmentId } })
    return lines.reduce((sum, l) => sum + Number(l.quantity), 0)
  }

  private static async assertParent(tenantId: string, fulfillmentId: string): Promise<FulfillmentEntity> {
    const ds = await tenantDataSourceFor(tenantId)
    const parent = await ds.getRepository(FulfillmentEntity).findOne({ where: { tenantId, fulfillmentId } })
    if (!parent) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return parent
  }

  private static async afterChange(tenantId: string, fulfillmentId: string, status: FulfillmentStatus, message: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await logEvent(ds, tenantId, fulfillmentId, status, message)
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})
  }

  static async listByParent(
    tenantId: string, fulfillmentId: string, query: GetFulfillmentItemsQuery,
  ): Promise<{ data: FulfillmentItem[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, fulfillmentId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [rows, total] = await ds.getRepository(FulfillmentItemEntity).findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => FulfillmentItemSchema.parse(r)), total }
  }

  static async addLine(tenantId: string, fulfillmentId: string, dto: AddFulfillmentItemDTO): Promise<FulfillmentItem> {
    const parent = await this.assertParent(tenantId, fulfillmentId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentItemEntity)
    try {
      const saved = await repo.save(repo.create({ tenantId, fulfillmentId, ...dto, unitValue: dto.unitValue ?? null }))
      await this.afterChange(tenantId, fulfillmentId, parent.status as FulfillmentStatus, `Item added: ${dto.name} ×${dto.quantity}`)
      return FulfillmentItemSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[OrderFulfillmentItemService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.ITEM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string, fulfillmentId: string, fulfillmentItemId: string, dto: UpdateFulfillmentItemDTO,
  ): Promise<FulfillmentItem> {
    const parent = await this.assertParent(tenantId, fulfillmentId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentItemEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId, fulfillmentItemId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, dto)
    const saved = await repo.save(row)
    await this.afterChange(tenantId, fulfillmentId, parent.status as FulfillmentStatus, `Item updated: ${saved.name}`)
    return FulfillmentItemSchema.parse(saved)
  }

  static async deleteLine(tenantId: string, fulfillmentId: string, fulfillmentItemId: string): Promise<void> {
    const parent = await this.assertParent(tenantId, fulfillmentId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentItemEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId, fulfillmentItemId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await this.afterChange(tenantId, fulfillmentId, parent.status as FulfillmentStatus, `Item removed: ${row.name}`)
  }
}
