import 'reflect-metadata'
import SettingService from '@/modules/setting/setting.service'
import PaymentShippingCarrierService from '@/modules/payment_shipping/payment_shipping.carrier.service'
import type { CarrierTracking, CarrierLabelRequest, CarrierLabel } from '@/modules/payment_shipping/adapters/base.carrier'
import type { CalculateShippingDTO } from '@/modules/payment_shipping/payment_shipping.dto'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

/**
 * Bridges fulfillment to the real payment_shipping carrier layer: per-tenant
 * carrier allowlist, live rate shopping, and live tracking — all backed by the
 * actual carrier adapters (UPS/FedEx/USPS/DHL/Royal Mail/TR carriers/etc.).
 */
export default class OrderFulfillmentCarrierService {

  /**
   * Carriers a tenant may use: the explicit `fulfillmentCarriers` setting
   * (comma list) when configured, otherwise every carrier whose credentials are
   * actually wired in payment_shipping.
   */
  static async allowedCarriers(tenantId: string): Promise<string[]> {
    const s = await SettingService.getByKeys(tenantId, ['fulfillmentCarriers']).catch(() => ({} as Record<string, string>))
    const configured = (s.fulfillmentCarriers ?? '').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
    if (configured.length > 0) return configured
    return PaymentShippingCarrierService.configuredCarriers(tenantId).catch(() => [])
  }

  /** Throw when `carrier` is not in the tenant's allowlist (when one exists). */
  static async assertCarrierAllowed(tenantId: string, carrier: string | undefined | null): Promise<void> {
    if (!carrier) return
    const allowed = await this.allowedCarriers(tenantId)
    // Empty allowlist (no carriers configured at all) ⇒ don't block manual entry.
    if (allowed.length === 0) return
    if (!allowed.includes(carrier.toUpperCase())) {
      throw new AppError(ORDER_FULFILLMENT_MESSAGES.CARRIER_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR)
    }
  }

  /** Live rate shopping across the tenant's configured carriers for an origin. */
  static getRates(tenantId: string, fromCountry: string, dto: CalculateShippingDTO) {
    return PaymentShippingCarrierService.getLiveRates(tenantId, fromCountry, dto)
  }

  /** Live tracking lookup against the carrier's real API. */
  static track(tenantId: string, carrier: string, trackingNumber: string): Promise<CarrierTracking | null> {
    return PaymentShippingCarrierService.track(tenantId, carrier, trackingNumber)
  }

  /** Generate a real shipping/return label via the carrier's label API. */
  static createLabel(tenantId: string, carrier: string, req: CarrierLabelRequest): Promise<CarrierLabel | null> {
    return PaymentShippingCarrierService.createLabel(tenantId, carrier, req)
  }

  /** Carriers that support integrated label generation for this tenant. */
  static labelCapableCarriers(tenantId: string): Promise<string[]> {
    return PaymentShippingCarrierService.labelCapableCarriers(tenantId)
  }

  /**
   * Map a free-text carrier status string to our fulfillment status enum.
   * Returns null when the status doesn't map to a meaningful transition.
   */
  static mapCarrierStatus(raw: string | null | undefined): FulfillmentStatus | null {
    if (!raw) return null
    const s = raw.toUpperCase()
    if (/(DELIVER)/.test(s)) return 'DELIVERED'
    if (/(RETURN)/.test(s)) return 'RETURNED'
    if (/(CANCEL|VOID)/.test(s)) return 'CANCELLED'
    if (/(OUT.?FOR.?DELIVERY|IN.?TRANSIT|TRANSIT|ARRIV|DEPART|EN.?ROUTE)/.test(s)) return 'IN_TRANSIT'
    if (/(SHIP|PICK.?UP|DISPATCH|ACCEPT|LABEL)/.test(s)) return 'SHIPPED'
    return null
  }
}
