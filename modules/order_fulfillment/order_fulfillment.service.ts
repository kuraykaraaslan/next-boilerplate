import 'reflect-metadata'
import { randomUUID } from 'crypto'
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
  type FulfillmentAnalytics,
} from './order_fulfillment.types'
import type {
  CreateFulfillmentDTO, UpdateFulfillmentDTO, GetFulfillmentsQuery,
  AddTrackingDTO, UpdateStatusDTO, BulkUpdateStatusDTO, AnalyticsQuery,
} from './order_fulfillment.dto'
import type { FulfillmentStatus, OrderFulfillmentState } from './order_fulfillment.enums'
import OrderFulfillmentCarrierService from './order_fulfillment.carrier.service'
import OrderFulfillmentAnalyticsService, { type CustomsDeclaration } from './order_fulfillment.analytics.service'
import OrderFulfillmentWarehouseService from './order_fulfillment.warehouse.service'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'

// Statuses that are terminal — no further transitions are allowed out of them.
const TERMINAL_STATUSES: ReadonlySet<FulfillmentStatus> = new Set(['DELIVERED', 'CANCELLED', 'RETURNED'])

// Every status maps to a webhook event so internal integrations and customer
// notifications fire on each transition (previously only SHIPPED/DELIVERED/
// CANCELLED emitted).
const STATUS_WEBHOOK: Record<FulfillmentStatus, string> = {
  PENDING: 'fulfillment.created',
  PROCESSING: 'fulfillment.processing',
  BACKORDERED: 'fulfillment.backordered',
  PACKED: 'fulfillment.packed',
  SHIPPED: 'fulfillment.shipped',
  IN_TRANSIT: 'fulfillment.in_transit',
  DELIVERED: 'fulfillment.delivered',
  CANCELLED: 'fulfillment.cancelled',
  RETURNED: 'fulfillment.returned',
}

const cacheKey = (fulfillmentId: string) => `order:fulfillment:${fulfillmentId}`

export default class OrderFulfillmentService {

  // ============================================================================
  // Create
  // ============================================================================

  static async create(tenantId: string, dto: CreateFulfillmentDTO): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)

    // Carrier allowlist + dangerous-goods completeness up-front.
    await OrderFulfillmentCarrierService.assertCarrierAllowed(tenantId, dto.carrier)
    OrderFulfillmentAnalyticsService.assertDangerousGoodsComplete(dto.items)

    // Resolve origin country from the warehouse when not explicitly provided.
    let originCountry = dto.originCountry
    if (!originCountry && dto.warehouseId) {
      const wh = await OrderFulfillmentWarehouseService.getById(tenantId, dto.warehouseId).catch(() => null)
      originCountry = wh?.country
    }

    const initialStatus: FulfillmentStatus = dto.items.some((i) => i.backorderedQuantity > 0) ? 'BACKORDERED' : 'PENDING'

    let savedFulfillmentId: string
    try {
      savedFulfillmentId = await ds.transaction(async (mgr) => {
        const fulfillmentRepo = mgr.getRepository(FulfillmentEntity)
        const itemRepo = mgr.getRepository(FulfillmentItemEntity)
        const eventRepo = mgr.getRepository(FulfillmentEventEntity)

        const fulfillment = fulfillmentRepo.create({
          tenantId,
          orderId: dto.orderId,
          status: initialStatus,
          carrier: dto.carrier,
          shippingMethodId: dto.shippingMethodId,
          warehouseId: dto.warehouseId,
          originCountry: originCountry?.toUpperCase(),
          estimatedDeliveryAt: dto.estimatedDeliveryAt ?? null,
          isPartial: dto.isPartial ?? false,
          weightKg: dto.weightKg ?? null,
          dimensions: dto.dimensions,
          declaredValue: dto.declaredValue ?? null,
          customsCurrency: dto.customsCurrency,
          publicTrackingToken: randomUUID().replace(/-/g, ''),
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
          backorderedQuantity: item.backorderedQuantity,
          hsCode: item.hsCode,
          countryOfOrigin: item.countryOfOrigin,
          unitValue: item.unitValue ?? null,
          isDangerousGoods: item.isDangerousGoods,
          hazmatClass: item.hazmatClass,
          unNumber: item.unNumber,
        }))
        await itemRepo.save(items)

        const event = eventRepo.create({ tenantId, fulfillmentId: savedFulfillment.fulfillmentId, status: initialStatus })
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
      status: initialStatus,
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

    await OrderFulfillmentCarrierService.assertCarrierAllowed(tenantId, dto.carrier)
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
    if (dto.status === 'RETURNED' && !row.returnedAt) row.returnedAt = now

    await repo.save(row)
    await OrderFulfillmentService.logEvent(ds, tenantId, fulfillmentId, dto.status, dto.message)
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})

    // Emit a webhook for every status transition (internal integrations) …
    const evt = STATUS_WEBHOOK[dto.status]
    await WebhookService.dispatchEvent(tenantId, evt as never, {
      fulfillmentId, orderId: row.orderId, status: dto.status,
      trackingNumber: row.trackingNumber ?? null, carrier: row.carrier ?? null,
    }).catch((err) => Logger.warn(`${evt} webhook failed: ${err?.message ?? err}`))

    // … and notify the end customer (best-effort) on each transition.
    await OrderFulfillmentService.notifyCustomer(tenantId, row, dto.status).catch(() => {})

    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  /**
   * Best-effort customer notification on a status change. Sends to the email in
   * the fulfillment metadata when present; never throws (notification failure
   * must not break the status transition).
   */
  private static async notifyCustomer(tenantId: string, row: FulfillmentEntity, status: FulfillmentStatus): Promise<void> {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const email = typeof meta.customerEmail === 'string' ? meta.customerEmail : null
    if (!email) return
    const trackUrl = row.publicTrackingToken ? `/track/${row.publicTrackingToken}` : (row.trackingUrl ?? '')
    const subject = `Order update: ${status.toLowerCase().replace(/_/g, ' ')}`
    const html = `<p>Your shipment status is now <strong>${status}</strong>.</p>` +
      (row.trackingNumber ? `<p>Tracking: ${row.carrier ?? ''} ${row.trackingNumber}</p>` : '') +
      (trackUrl ? `<p>Track your order: ${trackUrl}</p>` : '')
    const { default: NotificationMailQueueService } = await import('@/modules/notification_mail/notification_mail.queue.service')
    await NotificationMailQueueService.sendMail(tenantId, email, subject, html)
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

  // ============================================================================
  // Live carrier tracking
  // ============================================================================

  /**
   * Poll the carrier's real API for the latest status and advance the
   * fulfillment if the carrier reports a more-progressed state. Each new carrier
   * event is appended to the event log.
   */
  static async refreshTracking(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(FulfillmentEntity).findOne({ where: { tenantId, fulfillmentId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!row.carrier || !row.trackingNumber) {
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.TRACKING_NOT_AVAILABLE, 422, ErrorCode.VALIDATION_ERROR)
    }

    const tracking = await OrderFulfillmentCarrierService.track(tenantId, row.carrier, row.trackingNumber)
    if (!tracking) return OrderFulfillmentService.getById(tenantId, fulfillmentId)

    const mapped = OrderFulfillmentCarrierService.mapCarrierStatus(tracking.status)
    if (mapped && mapped !== row.status && !TERMINAL_STATUSES.has(row.status as FulfillmentStatus)) {
      await OrderFulfillmentService.updateStatus(tenantId, fulfillmentId, {
        status: mapped, message: `Carrier status: ${tracking.status}`,
      })
    } else {
      await OrderFulfillmentService.logEvent(ds, tenantId, fulfillmentId, row.status as FulfillmentStatus, `Carrier status: ${tracking.status}`)
    }
    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  /** Live rate shopping across the tenant's configured carriers (delegate). */
  static getRates = OrderFulfillmentCarrierService.getRates.bind(OrderFulfillmentCarrierService)
  /** Carriers enabled for the tenant (allowlist or configured). */
  static allowedCarriers = OrderFulfillmentCarrierService.allowedCarriers.bind(OrderFulfillmentCarrierService)

  // ============================================================================
  // Bulk operations
  // ============================================================================

  /** Apply a status transition to many fulfillments in one operation. */
  static async bulkUpdateStatus(tenantId: string, dto: BulkUpdateStatusDTO): Promise<{ updated: number; skipped: string[] }> {
    const skipped: string[] = []
    let updated = 0
    for (const id of dto.fulfillmentIds) {
      try {
        await OrderFulfillmentService.updateStatus(tenantId, id, { status: dto.status, message: dto.message })
        updated++
      } catch {
        skipped.push(id)
      }
    }
    return { updated, skipped }
  }

  // ============================================================================
  // Order-level fulfillment state (split / partial)
  // ============================================================================

  /** Roll up all fulfillments for an order into a single fulfillment state. */
  static async getOrderState(tenantId: string, orderId: string): Promise<OrderFulfillmentState> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(FulfillmentEntity).find({ where: { tenantId, orderId } })
    if (rows.length === 0) return 'UNFULFILLED'
    const allDone = rows.every((r) => r.status === 'DELIVERED' || r.status === 'SHIPPED')
    const anyOpen = rows.some((r) => ['PENDING', 'PROCESSING', 'BACKORDERED', 'PACKED'].includes(r.status))
    const anyPartial = rows.some((r) => r.isPartial)
    if (allDone && !anyPartial) return 'FULLY_FULFILLED'
    if (rows.some((r) => r.status !== 'PENDING') || anyOpen) return 'PARTIALLY_FULFILLED'
    return 'UNFULFILLED'
  }

  // ============================================================================
  // RMA link
  // ============================================================================

  /** Link this fulfillment to a payment_return_rma return request. */
  static async linkReturnRequest(tenantId: string, fulfillmentId: string, returnRequestId: string): Promise<FulfillmentWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FulfillmentEntity)
    const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    row.returnRequestId = returnRequestId
    await repo.save(row)
    await redis.del(cacheKey(fulfillmentId)).catch(() => {})
    return OrderFulfillmentService.getById(tenantId, fulfillmentId)
  }

  // ============================================================================
  // Public branded tracking
  // ============================================================================

  /**
   * Resolve a fulfillment by its public tracking token, returning a customer-
   * safe view (status, carrier, tracking number, events) for a branded
   * "Track your order" page.
   */
  static async getPublicTracking(tenantId: string, token: string): Promise<{
    status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null;
    estimatedDeliveryAt: Date | null; events: Array<{ status: string; message: string | null; createdAt: Date }>;
  }> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(FulfillmentEntity).findOne({ where: { tenantId, publicTrackingToken: token } })
    if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.PUBLIC_TRACKING_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const events = await ds.getRepository(FulfillmentEventEntity).find({
      where: { tenantId, fulfillmentId: row.fulfillmentId }, order: { createdAt: 'ASC' },
    })
    return {
      status: row.status,
      carrier: row.carrier ?? null,
      trackingNumber: row.trackingNumber ?? null,
      trackingUrl: row.trackingUrl ?? null,
      estimatedDeliveryAt: row.estimatedDeliveryAt ?? null,
      events: events.map((e) => ({ status: e.status, message: e.message ?? null, createdAt: e.createdAt })),
    }
  }

  // ============================================================================
  // Customs / SLA / analytics delegations
  // ============================================================================

  /** Build a customs declaration (CN22/CN23) for an international shipment. */
  static async getCustomsDeclaration(tenantId: string, fulfillmentId: string): Promise<CustomsDeclaration> {
    const f = await OrderFulfillmentService.getById(tenantId, fulfillmentId)
    return OrderFulfillmentAnalyticsService.buildCustomsDeclaration(f, f.items)
  }

  static listSlaBreaches = OrderFulfillmentAnalyticsService.listSlaBreaches.bind(OrderFulfillmentAnalyticsService)

  static getAnalytics(tenantId: string, query?: AnalyticsQuery): Promise<FulfillmentAnalytics> {
    return OrderFulfillmentAnalyticsService.getAnalytics(tenantId, query ?? {})
  }
}
