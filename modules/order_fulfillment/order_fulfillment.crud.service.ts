import 'reflect-metadata'
import { randomUUID } from 'crypto'
import { tenantDataSourceFor } from '@/modules/db'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import WebhookService from '@/modules/webhook/webhook.service'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import { FulfillmentItem as FulfillmentItemEntity } from './entities/fulfillment_item.entity'
import { FulfillmentEvent as FulfillmentEventEntity } from './entities/fulfillment_event.entity'
import type { FulfillmentWithItems } from './order_fulfillment.types'
import type { CreateFulfillmentDTO, UpdateFulfillmentDTO, AddTrackingDTO } from './order_fulfillment.dto'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import OrderFulfillmentCarrierService from './order_fulfillment.carrier.service'
import OrderFulfillmentAnalyticsService from './order_fulfillment.analytics.service'
import OrderFulfillmentWarehouseService from './order_fulfillment.warehouse.service'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { cacheKey } from './order_fulfillment.constants'
import { getById } from './order_fulfillment.read.service'
import { logEvent } from './order_fulfillment.events'
import { RedisIdempotencyService } from '@/modules/redis_idempotency'

export async function create(tenantId: string, dto: CreateFulfillmentDTO): Promise<FulfillmentWithItems> {
  // Retried create guard (e.g. order_fulfillment.created webhook double-fire).
  return RedisIdempotencyService.run(tenantId, dto.idempotencyKey, () => runCreate(tenantId, dto))
}

async function runCreate(tenantId: string, dto: CreateFulfillmentDTO): Promise<FulfillmentWithItems> {
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

  return getById(tenantId, savedFulfillmentId)
}

export async function update(tenantId: string, fulfillmentId: string, dto: UpdateFulfillmentDTO): Promise<FulfillmentWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(FulfillmentEntity)
  const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
  if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  Object.assign(row, dto)
  await repo.save(row)
  await redis.del(cacheKey(fulfillmentId)).catch(() => {})
  return getById(tenantId, fulfillmentId)
}

export async function addTracking(tenantId: string, fulfillmentId: string, dto: AddTrackingDTO): Promise<FulfillmentWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(FulfillmentEntity)
  const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
  if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  await OrderFulfillmentCarrierService.assertCarrierAllowed(tenantId, dto.carrier)
  row.carrier = dto.carrier
  row.trackingNumber = dto.trackingNumber
  row.trackingUrl = dto.trackingUrl
  await repo.save(row)
  await logEvent(
    ds, tenantId, fulfillmentId, row.status as FulfillmentStatus,
    `Tracking added: ${dto.carrier} ${dto.trackingNumber}`,
  )
  await redis.del(cacheKey(fulfillmentId)).catch(() => {})
  return getById(tenantId, fulfillmentId)
}

/** Link this fulfillment to a payment_return_rma return request. */
export async function linkReturnRequest(tenantId: string, fulfillmentId: string, returnRequestId: string): Promise<FulfillmentWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(FulfillmentEntity)
  const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
  if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  row.returnRequestId = returnRequestId
  await repo.save(row)
  await redis.del(cacheKey(fulfillmentId)).catch(() => {})
  return getById(tenantId, fulfillmentId)
}
