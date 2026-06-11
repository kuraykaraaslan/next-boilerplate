import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { ShippingMethod as ShippingMethodEntity } from './entities/shipping_method.entity'
import { ShippingRate as ShippingRateEntity } from './entities/shipping_rate.entity'
import { ShippingQuoteSchema, type ShippingQuote } from './payment_shipping.types'
import type { CalculateShippingDTO } from './payment_shipping.dto'
import { PAYMENT_SHIPPING_MESSAGES } from './payment_shipping.messages'

export default class PaymentShippingCalcService {

  static async calculateShipping(tenantId: string, dto: CalculateShippingDTO): Promise<ShippingQuote[]> {
    try {
      const ds = await tenantDataSourceFor(tenantId)
      const methods = await ds.getRepository(ShippingMethodEntity).find({ where: { tenantId, isActive: true } })
      if (methods.length === 0) return []

      const rates = await ds.getRepository(ShippingRateEntity).find({ where: { tenantId, isActive: true } })
      const methodById = new Map(methods.map((m) => [m.shippingMethodId, m]))
      const cheapestByMethod = new Map<string, ShippingQuote>()

      for (const rate of rates) {
        const method = methodById.get(rate.shippingMethodId)
        if (!method) continue
        if (!PaymentShippingCalcService.rateMatches(rate, dto)) continue

        const isFree = rate.freeThreshold != null && dto.subtotal >= Number(rate.freeThreshold)
        const price = isFree ? 0 : Number(rate.price)

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

  private static rateMatches(rate: ShippingRateEntity, dto: CalculateShippingDTO): boolean {
    if (rate.countryCode != null && dto.countryCode != null && rate.countryCode !== dto.countryCode) return false
    if (rate.countryCode != null && dto.countryCode == null) return false
    if (rate.region != null && dto.region != null && rate.region !== dto.region) return false
    if (rate.region != null && dto.region == null) return false
    if (rate.minWeight != null) {
      if (dto.weight == null || dto.weight < Number(rate.minWeight)) return false
    }
    if (rate.maxWeight != null) {
      if (dto.weight == null || dto.weight > Number(rate.maxWeight)) return false
    }
    if (rate.minSubtotal != null && dto.subtotal < Number(rate.minSubtotal)) return false
    if (rate.maxSubtotal != null && dto.subtotal > Number(rate.maxSubtotal)) return false
    return true
  }
}
