import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import redis from '@nb/redis'
import Logger from '@nb/logger'
import WebhookService from '@nb/webhook/server/webhook.service'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import type { FulfillmentWithItems } from './order_fulfillment.types'
import type { AddTrackingDTO, UpdateStatusDTO, BulkUpdateStatusDTO } from './order_fulfillment.dto'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import OrderFulfillmentCarrierService from './order_fulfillment.carrier.service'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { TERMINAL_STATUSES, STATUS_WEBHOOK, cacheKey } from './order_fulfillment.constants'
import { getById } from './order_fulfillment.read.service'
import { logEvent } from './order_fulfillment.events'
import { addTracking } from './order_fulfillment.crud.service'

export async function updateStatus(tenantId: string, fulfillmentId: string, dto: UpdateStatusDTO): Promise<FulfillmentWithItems> {
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
  await logEvent(ds, tenantId, fulfillmentId, dto.status, dto.message)
  await redis.del(cacheKey(fulfillmentId)).catch(() => {})

  // Emit a webhook for every status transition (internal integrations) …
  const evt = STATUS_WEBHOOK[dto.status]
  await WebhookService.dispatchEvent(tenantId, evt as never, {
    fulfillmentId, orderId: row.orderId, status: dto.status,
    trackingNumber: row.trackingNumber ?? null, carrier: row.carrier ?? null,
  }).catch((err) => Logger.warn(`${evt} webhook failed: ${err?.message ?? err}`))

  // … and notify the end customer (best-effort) on each transition.
  await notifyCustomer(tenantId, row, dto.status).catch(() => {})

  return getById(tenantId, fulfillmentId)
}

/**
 * Best-effort customer notification on a status change. Sends to the email in
 * the fulfillment metadata when present; never throws (notification failure
 * must not break the status transition).
 */
export async function notifyCustomer(tenantId: string, row: FulfillmentEntity, status: FulfillmentStatus): Promise<void> {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  const email = typeof meta.customerEmail === 'string' ? meta.customerEmail : null
  if (!email) return
  const trackUrl = row.publicTrackingToken ? `/track/${row.publicTrackingToken}` : (row.trackingUrl ?? '')
  const subject = `Order update: ${status.toLowerCase().replace(/_/g, ' ')}`
  const html = `<p>Your shipment status is now <strong>${status}</strong>.</p>` +
    (row.trackingNumber ? `<p>Tracking: ${row.carrier ?? ''} ${row.trackingNumber}</p>` : '') +
    (trackUrl ? `<p>Track your order: ${trackUrl}</p>` : '')
  const { default: NotificationMailQueueService } = await import('@nb/notification_mail/server/notification_mail.queue.service')
  await NotificationMailQueueService.sendMail(tenantId, email, subject, html)
}

export async function markShipped(tenantId: string, fulfillmentId: string, tracking?: AddTrackingDTO): Promise<FulfillmentWithItems> {
  if (tracking) {
    await addTracking(tenantId, fulfillmentId, tracking)
  }
  return updateStatus(tenantId, fulfillmentId, { status: 'SHIPPED' })
}

export async function cancel(tenantId: string, fulfillmentId: string, reason?: string): Promise<FulfillmentWithItems> {
  return updateStatus(tenantId, fulfillmentId, { status: 'CANCELLED', message: reason })
}

/** Apply a status transition to many fulfillments in one operation. */
export async function bulkUpdateStatus(tenantId: string, dto: BulkUpdateStatusDTO): Promise<{ updated: number; skipped: string[] }> {
  const skipped: string[] = []
  let updated = 0
  for (const id of dto.fulfillmentIds) {
    try {
      await updateStatus(tenantId, id, { status: dto.status, message: dto.message })
      updated++
    } catch {
      skipped.push(id)
    }
  }
  return { updated, skipped }
}

/**
 * Poll the carrier's real API for the latest status and advance the
 * fulfillment if the carrier reports a more-progressed state. Each new carrier
 * event is appended to the event log.
 */
export async function refreshTracking(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const row = await ds.getRepository(FulfillmentEntity).findOne({ where: { tenantId, fulfillmentId } })
  if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  if (!row.carrier || !row.trackingNumber) {
    throw new AppError(ORDER_FULFILLMENT_MESSAGES.TRACKING_NOT_AVAILABLE, 422, ErrorCode.VALIDATION_ERROR)
  }

  const tracking = await OrderFulfillmentCarrierService.track(tenantId, row.carrier, row.trackingNumber)
  if (!tracking) return getById(tenantId, fulfillmentId)

  const mapped = OrderFulfillmentCarrierService.mapCarrierStatus(tracking.status)
  if (mapped && mapped !== row.status && !TERMINAL_STATUSES.has(row.status as FulfillmentStatus)) {
    await updateStatus(tenantId, fulfillmentId, {
      status: mapped, message: `Carrier status: ${tracking.status}`,
    })
  } else {
    await logEvent(ds, tenantId, fulfillmentId, row.status as FulfillmentStatus, `Carrier status: ${tracking.status}`)
  }
  return getById(tenantId, fulfillmentId)
}
