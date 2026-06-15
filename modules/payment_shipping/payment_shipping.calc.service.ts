import 'reflect-metadata'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { ShippingRate as ShippingRateEntity } from './entities/shipping_rate.entity'
import { ShippingQuoteSchema, type ShippingQuote } from './payment_shipping.types'
import type { CalculateShippingDTO } from './payment_shipping.dto'
import { PAYMENT_SHIPPING_MESSAGES } from './payment_shipping.messages'
import PaymentShippingRulesService, { chargeableWeight } from './payment_shipping.rules.service'
import { getShippingRuleData } from './payment_shipping.cache'

export default class PaymentShippingCalcService {

  static async calculateShipping(tenantId: string, dto: CalculateShippingDTO): Promise<ShippingQuote[]> {
    try {
      const policy = await PaymentShippingRulesService.getPolicy(tenantId)

      // Prohibited destination / item — refuse before quoting.
      const block = PaymentShippingRulesService.isProhibited(policy, { countryCode: dto.countryCode, skus: dto.skus })
      if (block.prohibited) throw new AppError(block.reason ?? PAYMENT_SHIPPING_MESSAGES.PROHIBITED, 422, ErrorCode.VALIDATION_ERROR)

      // Carriers bill on the greater of actual and dimensional weight.
      const chargeable = chargeableWeight(dto.weight ?? 0, dto.dimensions, policy.dimDivisor)
      const packageCount = PaymentShippingRulesService.packageCount(chargeable, policy)
      const duties = dto.incoterm === 'DDP' ? PaymentShippingRulesService.estimateDuties(dto.declaredValue ?? dto.subtotal, policy) : 0
      const matchWeight = chargeable > 0 ? chargeable : dto.weight

      const { methods, rates } = await getShippingRuleData(tenantId)
      if (methods.length === 0) return []

      const methodById = new Map(methods.map((m) => [m.shippingMethodId, m]))
      const cheapestByMethod = new Map<string, ShippingQuote>()

      for (const rate of rates) {
        const method = methodById.get(rate.shippingMethodId)
        if (!method) continue
        if (!PaymentShippingCalcService.rateMatches(rate, dto, matchWeight)) continue

        const isFree = rate.freeThreshold != null && dto.subtotal >= Number(rate.freeThreshold)
        // Fees + per-package multiplier apply to the base rate (free shipping
        // still waives the base but duties are always the buyer-borne amount).
        const base = isFree ? 0 : PaymentShippingRulesService.applyFees(Number(rate.price), policy) * packageCount
        const handlingFee = isFree ? 0 : policy.handlingFee * packageCount
        const price = Math.round((base + duties) * 100) / 100

        const quote = ShippingQuoteSchema.parse({
          shippingMethodId: method.shippingMethodId,
          methodName: method.name,
          carrier: method.carrier ?? null,
          rateId: rate.shippingRateId,
          price,
          currency: rate.currency,
          estimatedDaysMin: rate.estimatedDaysMin ?? null,
          estimatedDaysMax: rate.estimatedDaysMax ?? null,
          isFree,
          handlingFee,
          estimatedDuties: duties,
          packageCount,
          chargeableWeight: chargeable || null,
          incoterm: dto.incoterm ?? null,
          live: false,
        })

        const current = cheapestByMethod.get(method.shippingMethodId)
        if (!current || quote.price < current.price) {
          cheapestByMethod.set(method.shippingMethodId, quote)
        }
      }

      return Array.from(cheapestByMethod.values()).sort((a, b) => a.price - b.price)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${PAYMENT_SHIPPING_MESSAGES.CALCULATION_FAILED}: ${error}`)
      throw new AppError(PAYMENT_SHIPPING_MESSAGES.CALCULATION_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  private static rateMatches(rate: ShippingRateEntity, dto: CalculateShippingDTO, weight?: number): boolean {
    if (rate.countryCode != null && dto.countryCode != null && rate.countryCode !== dto.countryCode) return false
    if (rate.countryCode != null && dto.countryCode == null) return false
    if (rate.region != null && dto.region != null && rate.region !== dto.region) return false
    if (rate.region != null && dto.region == null) return false
    if (rate.minWeight != null) {
      if (weight == null || weight < Number(rate.minWeight)) return false
    }
    if (rate.maxWeight != null) {
      if (weight == null || weight > Number(rate.maxWeight)) return false
    }
    if (rate.minSubtotal != null && dto.subtotal < Number(rate.minSubtotal)) return false
    if (rate.maxSubtotal != null && dto.subtotal > Number(rate.maxSubtotal)) return false
    return true
  }
}
