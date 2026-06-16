import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import { FulfillmentItem as FulfillmentItemEntity } from './entities/fulfillment_item.entity'
import { FulfillmentEvent as FulfillmentEventEntity } from './entities/fulfillment_event.entity'
import {
  SafeFulfillmentSchema, FulfillmentEventSchema, FulfillmentWithItemsSchema,
  type SafeFulfillment, type FulfillmentEvent, type FulfillmentWithItems,
} from './order_fulfillment.types'
import type { GetFulfillmentsQuery } from './order_fulfillment.dto'
import type { OrderFulfillmentState } from './order_fulfillment.enums'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'

export async function getById(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
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

export async function list(tenantId: string, query: GetFulfillmentsQuery): Promise<{ data: SafeFulfillment[]; total: number }> {
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

export async function listEvents(tenantId: string, fulfillmentId: string): Promise<FulfillmentEvent[]> {
  const ds = await tenantDataSourceFor(tenantId)
  const rows = await ds.getRepository(FulfillmentEventEntity).find({
    where: { tenantId, fulfillmentId },
    order: { createdAt: 'ASC' },
  })
  return rows.map((r) => FulfillmentEventSchema.parse(r))
}

/** Roll up all fulfillments for an order into a single fulfillment state. */
export async function getOrderState(tenantId: string, orderId: string): Promise<OrderFulfillmentState> {
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

/**
 * Resolve a fulfillment by its public tracking token, returning a customer-
 * safe view (status, carrier, tracking number, events) for a branded
 * "Track your order" page.
 */
export async function getPublicTracking(tenantId: string, token: string): Promise<{
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
