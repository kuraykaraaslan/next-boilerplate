import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import redis from '@nb/redis'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import type { FulfillmentWithItems } from './order_fulfillment.types'
import type { GenerateLabelDTO, LabelAddress } from './order_fulfillment.dto'
import type { CarrierAddress, CarrierLabel } from '@nb/payment_shipping/server/adapters/base.carrier'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import OrderFulfillmentCarrierService from './order_fulfillment.carrier.service'
import OrderFulfillmentWarehouseService from './order_fulfillment.warehouse.service'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { cacheKey } from './order_fulfillment.constants'
import { getById } from './order_fulfillment.read.service'
import { logEvent } from './order_fulfillment.events'

/** Map a warehouse to a carrier address (origin). */
function warehouseToAddress(wh: { name: string; country: string; city?: string | null; address?: { line1?: string; line2?: string; postalCode?: string; region?: string } | null }): CarrierAddress | null {
  const a = wh.address
  if (!a?.line1 || !wh.city || !a.postalCode) return null
  return {
    name: wh.name, street1: a.line1, street2: a.line2, city: wh.city,
    state: a.region, postalCode: a.postalCode, countryCode: wh.country,
  }
}

function labelAddr(a: LabelAddress): CarrierAddress {
  return {
    name: a.name, company: a.company, phone: a.phone, email: a.email,
    street1: a.street1, street2: a.street2, city: a.city, state: a.state,
    postalCode: a.postalCode, countryCode: a.countryCode,
  }
}

// Lenient parse of an order shipping address stored in fulfillment metadata.
function LabelAddressSafe(value: unknown): LabelAddress | null {
  if (!value || typeof value !== 'object') return null
  const a = value as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  if (!str(a.name) || !str(a.street1) || !str(a.city) || !str(a.postalCode) || !str(a.countryCode)) return null
  return {
    name: a.name as string, company: str(a.company), phone: str(a.phone), email: str(a.email),
    street1: a.street1 as string, street2: str(a.street2), city: a.city as string,
    state: str(a.state), postalCode: a.postalCode as string, countryCode: a.countryCode as string,
  }
}

/**
 * Generate a shipping (or return) label via the carrier's real label API,
 * persist the returned tracking number, and return the label payload (base64)
 * for the caller to print. `from` defaults to the fulfillment's warehouse and
 * `to` to the order's shipping address (fulfillment.metadata.shippingAddress).
 */
export async function generateLabel(
  tenantId: string, fulfillmentId: string, dto: GenerateLabelDTO, opts?: { isReturn?: boolean },
): Promise<{ label: CarrierLabel; fulfillment: FulfillmentWithItems }> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(FulfillmentEntity)
  const row = await repo.findOne({ where: { tenantId, fulfillmentId } })
  if (!row) throw new AppError(ORDER_FULFILLMENT_MESSAGES.FULFILLMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  if (!row.carrier) throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_REQUIRED, 422, ErrorCode.VALIDATION_ERROR)
  await OrderFulfillmentCarrierService.assertCarrierAllowed(tenantId, row.carrier)

  // Resolve origin (warehouse) and destination (order) addresses.
  let from: CarrierAddress | null = dto.from ? labelAddr(dto.from) : null
  if (!from && row.warehouseId) {
    const wh = await OrderFulfillmentWarehouseService.getById(tenantId, row.warehouseId).catch(() => null)
    if (wh) from = warehouseToAddress(wh)
  }
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  let to: CarrierAddress | null = dto.to ? labelAddr(dto.to) : null
  if (!to && meta.shippingAddress && typeof meta.shippingAddress === 'object') {
    const parsed = LabelAddressSafe(meta.shippingAddress)
    if (parsed) to = labelAddr(parsed)
  }
  if (!from || !to) throw new AppError(ORDER_FULFILLMENT_MESSAGES.LABEL_ADDRESS_REQUIRED, 422, ErrorCode.VALIDATION_ERROR)

  const isReturn = opts?.isReturn === true
  const label = await OrderFulfillmentCarrierService.createLabel(tenantId, row.carrier, {
    // Return labels reverse the direction (customer → warehouse).
    from: isReturn ? to : from,
    to: isReturn ? from : to,
    weightKg: dto.weightKg ?? row.weightKg ?? 0.5,
    dimensionsCm: row.dimensions?.length && row.dimensions?.width && row.dimensions?.height
      ? { length: row.dimensions.length, width: row.dimensions.width, height: row.dimensions.height } : undefined,
    serviceCode: dto.serviceCode,
    labelFormat: dto.labelFormat,
    reference: row.orderId,
    isReturn,
  })
  if (!label) throw new AppError(ORDER_FULFILLMENT_MESSAGES.LABEL_NOT_AVAILABLE, 422, ErrorCode.VALIDATION_ERROR)

  // Persist tracking + label metadata (the base64 blob is returned, not stored).
  if (!isReturn) row.trackingNumber = label.trackingNumber
  row.metadata = {
    ...meta,
    [isReturn ? 'returnLabel' : 'label']: {
      carrier: label.carrier, trackingNumber: label.trackingNumber,
      format: label.labelFormat, url: label.labelUrl ?? null, generatedAt: new Date().toISOString(),
    },
  }
  await repo.save(row)
  await logEvent(ds, tenantId, fulfillmentId, row.status as FulfillmentStatus,
    `${isReturn ? 'Return label' : 'Label'} generated: ${label.carrier} ${label.trackingNumber}`)
  await redis.del(cacheKey(fulfillmentId)).catch(() => {})

  return { label, fulfillment: await getById(tenantId, fulfillmentId) }
}

/** Generate a prepaid return label (reverse logistics). */
export function generateReturnLabel(tenantId: string, fulfillmentId: string, dto: GenerateLabelDTO): Promise<{ label: CarrierLabel; fulfillment: FulfillmentWithItems }> {
  return generateLabel(tenantId, fulfillmentId, dto, { isReturn: true })
}
