import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import WebhookService from '@/modules/webhook/webhook.service'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import { FulfillmentItem as FulfillmentItemEntity } from './entities/fulfillment_item.entity'
import { FulfillmentEvent as FulfillmentEventEntity } from './entities/fulfillment_event.entity'
import {
  SafeFulfillmentSchema, FulfillmentEventSchema, FulfillmentWithItemsSchema,
  type SafeFulfillment, type FulfillmentEvent, type FulfillmentWithItems,
} from './order_fulfillment.types'
import type {
  CreateFulfillmentDTO, UpdateFulfillmentDTO, GetFulfillmentsQuery,
  AddTrackingDTO, UpdateStatusDTO,
} from './order_fulfillment.dto'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'

// Statuses that are terminal — no further transitions are allowed out of them.
const TERMINAL_STATUSES: ReadonlySet<FulfillmentStatus> = new Set(['DELIVERED', 'CANCELLED', 'RETURNED'])

const cacheKey = (fulfillmentId: string) => `order:fulfillment:${fulfillmentId}`

export default class OrderFulfillmentService {

  // ============================================================================
  // Create
  // ============================================================================

  static async create(tenantId: string, dto: CreateFulfillmentDTO): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)

    let savedFulfillmentId: string
    try {
      savedFulfillmentId = await ds.transaction(async (mgr) => {
        const fulfillmentRepo = mgr.getRepository(FulfillmentEntity)
        const itemRepo = mgr.getRepository(FulfillmentItemEntity)
        const eventRepo = mgr.getRepository(FulfillmentEventEntity)

        const fulfillment = fulfillmentRepo.create({
          tenantId,
          orderId: dto.orderId,
          status: 'PENDING',
          carrier: dto.carrier,
          shippingMethodId: dto.shippingMethodId,
          notes: dto.notes,
          metadata: dto.metadata,
        })
        const savedFulfillment = await fulfillmentRepo.save(fulfillment)

        const items = dto.items.map((item) => itemRepo.create({
          tenantId,
          fulfillmentId: savedFulfillment.fulfillmentId,
          orderItemId: item.orderItemId,
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
        }))
        await itemRepo.save(items)

        const event = eventRepo.create({ tenantId, fulfillmentId: savedFulfillment.fulfillmentId, status: 'PENDING' })
        await eventRepo.save(event)

        return savedFulfillment.fulfillmentId
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_CREATE_FAILED}: ${error}`)
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }

    await WebhookService.dispatchEvent(tenantId, 'fulfillment.created', {
      fulfillmentId: savedFulfillmentId,
      status: 'PENDING',
    }).catch((err) => Logger.warn(`fulfillment.created webhook failed: ${err?.message ?? err}`))

    return OrderFulfillmentService.getById(tenantId, savedFulfillmentId)
  }

  // ============================================================================
  // Read
  // ============================================================================

  static async getById(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const fulfillment = await ds.getRepository(FulfillmentEntity).findOne({ where: { tenantId, fulfillmentId } })
    if (!fulfillment) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const items = await ds.getRepository(FulfillmentItemEntity).find({
      where: { tenantId, fulfillmentId },
      order: { createdAt: 'ASC' },
    })
    const events = await ds.getRepository(FulfillmentEventEntity).find({
      where: { tenantId, fulfillmentId },
      order: { createdAt: 'ASC' },
    })

    return FulfillmentWithItemsSchema.parse({ ...fulfillment, items, events })
  }

  static async list(tenantId: string, query: GetFulfillmentsQuery): Promise<{ data: SafeFulfillment[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.orderId) where['orderId'] = query.orderId
    if (query.status) where['status'] = query.status
    if (query.carrier) where['carrier'] = query.carrier
    if (query.trackingNumber) where['trackingNumber'] = query.trackingNumber

    const [rows, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeFulfillmentSchema.parse(r)), total }
  }

  // ============================================================================
  // Update
  // ============================================================================

  static async update(tenantId: string, fulfillmentId: string, dto: UpdateFulfillmentDTO): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    Object.assign(row, dto)
    await repo.save(row)
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})
    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  static async addTracking(tenantId: string, fulfillmentId: string, dto: AddTrackingDTO): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    row.carrier = dto.carrier
    row.trackingNumber = dto.trackingNumber
    row.trackingUrl = dto.trackingUrl
    await repo.save(row)
    await OrderFulfillmentService.logEvent(
      ds, tenantId, fulfillmentId, row.status as FulfillmentStatus,
      `Tracking added: ${dto.carrier} ${dto.trackingNumber}`,
    )
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})
    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  // ============================================================================
  // Status lifecycle
  // ============================================================================

  static async updateStatus(tenantId: string, fulfillmentId: string, dto: UpdateStatusDTO): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const current = row.status as FulfillmentStatus
    if (TERMINAL_STATUSES.has(current) && current !== dto.status) {
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.INVALID_STATUS_TRANSITION, 409, ErrorCode.CONFLICT)
    }

    row.status = dto.status
    const now = new Date()
    if (dto.status === 'PACKED' && !row.packedAt) row.packedAt = now
    if (dto.status === 'SHIPPED' && !row.shippedAt) row.shippedAt = now
    if (dto.status === 'DELIVERED' && !row.deliveredAt) row.deliveredAt = now
    if (dto.status === 'CANCELLED' && !row.cancelledAt) row.cancelledAt = now

    await repo.save(row)
    await OrderFulfillmentService.logEvent(ds, tenantId, fulfillmentId, dto.status, dto.message)
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})

    // Map terminal/shipping transitions to webhook events (covers markShipped/cancel,
    // which delegate here). Other statuses (PENDING/PACKED) do not emit.
    const statusEvent = { SHIPPED: 'fulfillment.shipped', DELIVERED: 'fulfillment.delivered', CANCELLED: 'fulfillment.cancelled' } as const
    const evt = statusEvent[dto.status as keyof typeof statusEvent]
    if (evt) {
      await WebhookService.dispatchEvent(tenantId, evt, {
        fulfillmentId,
        orderId: row.orderId,
        status: dto.status,
      }).catch((err) => Logger.warn(`${evt} webhook failed: ${err?.message ?? err}`))
    }

    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  static async markShipped(tenantId: string, fulfillmentId: string, tracking?: AddTrackingDTO): Promise<FulfillmentWithItems> {
    if (tracking) {
      await OrderFulfillmentService.addTracking(tenantId, fulfillmentId, tracking)
    }
    return OrderFulfillmentService.updateStatus(tenantId, fulfillmentId, { status: 'SHIPPED' })
  }

  static async cancel(tenantId: string, fulfillmentId: string, reason?: string): Promise<FulfillmentWithItems> {
    return OrderFulfillmentService.updateStatus(tenantId, fulfillmentId, { status: 'CANCELLED', message: reason })
  }

  // ============================================================================
  // Events
  // ============================================================================

  static async listEvents(tenantId: string, fulfillmentId: string): Promise<FulfillmentEvent[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(FulfillmentEventEntity).find({
      where: { tenantId, fulfillmentId },
      order: { createdAt: 'ASC' },
    })
    return rows.map((r) => FulfillmentEventSchema.parse(r))
  }

  private static async logEvent(
    ds: DataSource,
    tenantId: string,
    fulfillmentId: string,
    status: FulfillmentStatus,
    message?: string,
  ): Promise<void> {
    try {
      const repo = ds.getRepository(FulfillmentEventEntity)
      const event = repo.create({ tenantId, fulfillmentId, status, message })
      await repo.save(event)
    } catch (error) {
      Logger.error(`${ORDER_FULFILLMENT_MESSAGES.EVENT_LOG_FAILED}: ${error}`)
    }
  }
}
