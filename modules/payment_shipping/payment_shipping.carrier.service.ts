import 'reflect-metadata'
import { ShippingQuoteSchema, type ShippingQuote } from './payment_shipping.types'
import type { CalculateShippingDTO } from './payment_shipping.dto'
import PaymentShippingRulesService, { chargeableWeight } from './payment_shipping.rules.service'
import { carriersForOrigin, getCarrierAdapter, allCarrierAdapters } from './adapters/registry'
import type { CarrierRate, CarrierTracking } from './adapters/base.carrier'

/**
 * Live carrier rates + tracking over the real carrier adapters (UPS, FedEx,
 * DHL, Royal Mail, Yurtiçi). Only carriers the tenant has configured return
 * rates; unconfigured ones are skipped (no mock). Handling fees / duties from
 * the rules policy are layered on top of the carrier's base price so live and
 * stored quotes are comparable.
 */
export default class PaymentShippingCarrierService {

  /**
   * Live quotes from every configured carrier that serves the origin country.
   * `fromCountry` is required for carrier rating (the warehouse/origin).
   */
  static async getLiveRates(tenantId: string, fromCountry: string, dto: CalculateShippingDTO): Promise<ShippingQuote[]> {
    if (!dto.countryCode) return []
    const policy = await PaymentShippingRulesService.getPolicy(tenantId)
    const block = PaymentShippingRulesService.isProhibited(policy, { countryCode: dto.countryCode, skus: dto.skus })
    if (block.prohibited) return []

    const weight = chargeableWeight(dto.weight ?? 0, dto.dimensions, policy.dimDivisor)
    const duties = dto.incoterm === 'DDP' ? PaymentShippingRulesService.estimateDuties(dto.declaredValue ?? dto.subtotal, policy) : 0
    const req = {
      fromCountry, toCountry: dto.countryCode, toPostal: undefined,
      weightKg: weight || dto.weight || 0.5,
      dimensionsCm: dto.dimensions, declaredValue: dto.declaredValue, currency: dto.currency,
    }

    const adapters = carriersForOrigin(fromCountry)
    const results = await Promise.allSettled(adapters.map(async (a) => {
      if (!(await a.isConfigured(tenantId))) return [] as CarrierRate[]
      return a.getRates(tenantId, req)
    }))

    const quotes: ShippingQuote[] = []
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      for (const rate of r.value) {
        quotes.push(ShippingQuoteSchema.parse({
          shippingMethodId: '00000000-0000-4000-8000-000000000000', // synthetic — live rate has no stored method
          methodName: rate.serviceName,
          carrier: rate.carrier,
          rateId: '00000000-0000-4000-8000-000000000000',
          price: Math.round((PaymentShippingRulesService.applyFees(rate.price, policy) + duties) * 100) / 100,
          currency: rate.currency,
          estimatedDaysMin: rate.estimatedDays ?? null,
          estimatedDaysMax: rate.estimatedDays ?? null,
          isFree: false,
          handlingFee: policy.handlingFee,
          estimatedDuties: duties,
          packageCount: PaymentShippingRulesService.packageCount(weight, policy),
          chargeableWeight: weight || null,
          incoterm: dto.incoterm ?? null,
          live: true,
        }))
      }
    }
    return quotes.sort((a, b) => a.price - b.price)
  }

  /** Track a shipment via the named carrier's live API. */
  static async track(tenantId: string, carrier: string, trackingNumber: string): Promise<CarrierTracking | null> {
    const adapter = getCarrierAdapter(carrier)
    if (!adapter) return null
    return adapter.track(tenantId, trackingNumber)
  }

  /** Which carriers are configured (live) for this tenant — for admin UIs. */
  static async configuredCarriers(tenantId: string): Promise<string[]> {
    const out: string[] = []
    for (const a of allCarrierAdapters()) {
      try { if (await a.isConfigured(tenantId)) out.push(a.code) } catch { /* skip */ }
    }
    return out
  }
}
