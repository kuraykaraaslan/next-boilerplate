import 'reflect-metadata'
import type {
  SafeFulfillment, FulfillmentEvent, FulfillmentWithItems, FulfillmentAnalytics,
} from './order_fulfillment.types'
import type {
  CreateFulfillmentDTO, UpdateFulfillmentDTO, GetFulfillmentsQuery,
  AddTrackingDTO, UpdateStatusDTO, BulkUpdateStatusDTO, AnalyticsQuery,
  GenerateLabelDTO,
} from './order_fulfillment.dto'
import type { CarrierLabel } from '@kuraykaraaslan/payment_shipping/server/adapters/base.carrier'
import type { OrderFulfillmentState } from './order_fulfillment.enums'
import OrderFulfillmentCarrierService from './order_fulfillment.carrier.service'
import OrderFulfillmentAnalyticsService, { type CustomsDeclaration } from './order_fulfillment.analytics.service'
import { getById, list, listEvents, getOrderState, getPublicTracking } from './order_fulfillment.read.service'
import { create, update, addTracking, linkReturnRequest } from './order_fulfillment.crud.service'
import { updateStatus, markShipped, cancel, bulkUpdateStatus, refreshTracking, pack, ship, deliver } from './order_fulfillment.status.service'
import { generateLabel, generateReturnLabel } from './order_fulfillment.label.service'

/**
 * Order-fulfillment service facade. The implementation is split across focused
 * modules (`order_fulfillment.read.service`, `.crud.service`, `.status.service`,
 * `.label.service`, plus the `.events` / `.constants` helpers and the existing
 * carrier / analytics / warehouse sub-services); this class preserves the
 * single `OrderFulfillmentService.*` entry point its callers depend on.
 */
export default class OrderFulfillmentService {
  static create(tenantId: string, dto: CreateFulfillmentDTO): Promise<FulfillmentWithItems> {
    return create(tenantId, dto)
  }

  static getById(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    return getById(tenantId, fulfillmentId)
  }

  static list(tenantId: string, query: GetFulfillmentsQuery): Promise<{ data: SafeFulfillment[]; total: number }> {
    return list(tenantId, query)
  }

  static update(tenantId: string, fulfillmentId: string, dto: UpdateFulfillmentDTO): Promise<FulfillmentWithItems> {
    return update(tenantId, fulfillmentId, dto)
  }

  static addTracking(tenantId: string, fulfillmentId: string, dto: AddTrackingDTO): Promise<FulfillmentWithItems> {
    return addTracking(tenantId, fulfillmentId, dto)
  }

  static updateStatus(tenantId: string, fulfillmentId: string, dto: UpdateStatusDTO): Promise<FulfillmentWithItems> {
    return updateStatus(tenantId, fulfillmentId, dto)
  }

  static markShipped(tenantId: string, fulfillmentId: string, tracking?: AddTrackingDTO): Promise<FulfillmentWithItems> {
    return markShipped(tenantId, fulfillmentId, tracking)
  }

  static pack(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    return pack(tenantId, fulfillmentId)
  }

  static ship(tenantId: string, fulfillmentId: string, tracking?: AddTrackingDTO): Promise<FulfillmentWithItems> {
    return ship(tenantId, fulfillmentId, tracking)
  }

  static deliver(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    return deliver(tenantId, fulfillmentId)
  }

  static cancel(tenantId: string, fulfillmentId: string, reason?: string): Promise<FulfillmentWithItems> {
    return cancel(tenantId, fulfillmentId, reason)
  }

  static listEvents(tenantId: string, fulfillmentId: string): Promise<FulfillmentEvent[]> {
    return listEvents(tenantId, fulfillmentId)
  }

  static refreshTracking(tenantId: string, fulfillmentId: string): Promise<FulfillmentWithItems> {
    return refreshTracking(tenantId, fulfillmentId)
  }

  static bulkUpdateStatus(tenantId: string, dto: BulkUpdateStatusDTO): Promise<{ updated: number; skipped: string[] }> {
    return bulkUpdateStatus(tenantId, dto)
  }

  static getOrderState(tenantId: string, orderId: string): Promise<OrderFulfillmentState> {
    return getOrderState(tenantId, orderId)
  }

  static linkReturnRequest(tenantId: string, fulfillmentId: string, returnRequestId: string): Promise<FulfillmentWithItems> {
    return linkReturnRequest(tenantId, fulfillmentId, returnRequestId)
  }

  static getPublicTracking(tenantId: string, token: string): ReturnType<typeof getPublicTracking> {
    return getPublicTracking(tenantId, token)
  }

  static generateLabel(
    tenantId: string, fulfillmentId: string, dto: GenerateLabelDTO, opts?: { isReturn?: boolean },
  ): Promise<{ label: CarrierLabel; fulfillment: FulfillmentWithItems }> {
    return generateLabel(tenantId, fulfillmentId, dto, opts)
  }

  static generateReturnLabel(tenantId: string, fulfillmentId: string, dto: GenerateLabelDTO): Promise<{ label: CarrierLabel; fulfillment: FulfillmentWithItems }> {
    return generateReturnLabel(tenantId, fulfillmentId, dto)
  }

  /** Build a customs declaration (CN22/CN23) for an international shipment. */
  static async getCustomsDeclaration(tenantId: string, fulfillmentId: string): Promise<CustomsDeclaration> {
    const f = await getById(tenantId, fulfillmentId)
    return OrderFulfillmentAnalyticsService.buildCustomsDeclaration(f, f.items)
  }

  static getAnalytics(tenantId: string, query?: AnalyticsQuery): Promise<FulfillmentAnalytics> {
    return OrderFulfillmentAnalyticsService.getAnalytics(tenantId, query ?? {})
  }

  // Live rate shopping / carrier-capability delegations.
  static getRates = OrderFulfillmentCarrierService.getRates.bind(OrderFulfillmentCarrierService)
  static allowedCarriers = OrderFulfillmentCarrierService.allowedCarriers.bind(OrderFulfillmentCarrierService)
  static listSlaBreaches = OrderFulfillmentAnalyticsService.listSlaBreaches.bind(OrderFulfillmentAnalyticsService)
  static labelCapableCarriers = OrderFulfillmentCarrierService.labelCapableCarriers.bind(OrderFulfillmentCarrierService)
}
