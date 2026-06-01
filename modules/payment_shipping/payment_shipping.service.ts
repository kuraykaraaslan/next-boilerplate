import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { env } from '@/modules/env'
import { ShippingMethod as ShippingMethodEntity } from './entities/shipping_method.entity'
import { ShippingRate as ShippingRateEntity } from './entities/shipping_rate.entity'
import {
  SafeShippingMethodSchema, ShippingRateSchema, ShippingMethodWithRatesSchema, ShippingQuoteSchema,
  type SafeShippingMethod, type ShippingRate, type ShippingMethodWithRates, type ShippingQuote,
} from './payment_shipping.types'
import type {
  CreateShippingMethodDTO, UpdateShippingMethodDTO, GetShippingMethodsQuery,
  CreateShippingRateDTO, UpdateShippingRateDTO, CalculateShippingDTO,
} from './payment_shipping.dto'
import { PAYMENT_SHIPPING_MESSAGES } from './payment_shipping.messages'

const CACHE_TTL = env.TENANT_CACHE_TTL ?? 300

// Cache key helpers
const methodKey = (id: string) => `pay:ship:${id}`

export default class PaymentShippingService {

  // ============================================================================
  // Shipping methods
  // ============================================================================

  static async createMethod(tenantId: string, dto: CreateShippingMethodDTO): Promise<SafeShippingMethod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)

    // Codes are meant to be unique-ish per tenant; reject duplicates of live methods.
    const existing = await repo.findOne({ where: { tenantId, code: dto.code } })
    if (existing) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_CODE_TAKEN)

    const method = repo.create({ ...dto, tenantId })
    const saved = await repo.save(method)
    return SafeShippingMethodSchema.parse(saved)
  }

  static async updateMethod(
    tenantId: string, methodId: string, dto: UpdateShippingMethodDTO,
  ): Promise<SafeShippingMethod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const row = await repo.findOne({ where: { tenantId, shippingMethodId: methodId } })
    if (!row) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND)

    // If code is changing, guard tenant-uniqueness against other methods.
    if (dto.code && dto.code !== row.code) {
      const clash = await repo.findOne({ where: { tenantId, code: dto.code } })
      if (clash) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_CODE_TAKEN)
    }

    Object.assign(row, dto)
    const saved = await repo.save(row)
    await redis.del(methodKey(methodId))
    return SafeShippingMethodSchema.parse(saved)
  }

  static async getMethod(tenantId: string, methodId: string): Promise<ShippingMethodWithRates> {
    return singleFlight(methodKey(methodId), async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const method = await ds.getRepository(ShippingMethodEntity).findOne({
        where: { tenantId, shippingMethodId: methodId },
      })
      if (!method) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND)
      const rates = await ds.getRepository(ShippingRateEntity).find({
        where: { tenantId, shippingMethodId: methodId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      })
      return ShippingMethodWithRatesSchema.parse({ ...method, rates })
    })
  }

  static async listMethods(
    tenantId: string, query: GetShippingMethodsQuery,
  ): Promise<{ data: SafeShippingMethod[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.isActive !== undefined) where['isActive'] = query.isActive
    if (query.carrier) where['carrier'] = query.carrier

    const [rows, total] = await repo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeShippingMethodSchema.parse(r)), total }
  }

  static async deleteMethod(tenantId: string, methodId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingMethodEntity)
    const row = await repo.findOne({ where: { tenantId, shippingMethodId: methodId } })
    if (!row) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND)
    await repo.softRemove(row)
    await redis.del(methodKey(methodId))
  }

  // ============================================================================
  // Shipping rates
  // ============================================================================

  static async createRate(tenantId: string, dto: CreateShippingRateDTO): Promise<ShippingRate> {
    const ds = await tenantDataSourceFor(tenantId)

    // Parent method must exist (and belong to this tenant).
    const method = await ds.getRepository(ShippingMethodEntity).findOne({
      where: { tenantId, shippingMethodId: dto.shippingMethodId },
    })
    if (!method) throw new Error(PAYMENT_SHIPPING_MESSAGES.METHOD_NOT_FOUND)

    PaymentShippingService.assertRanges(dto.minWeight, dto.maxWeight, dto.minSubtotal, dto.maxSubtotal)

    const repo = ds.getRepository(ShippingRateEntity)
    const rate = repo.create({ ...dto, tenantId })
    const saved = await repo.save(rate)
    // Quote calculation reads this method's rates via its cache key.
    await redis.del(methodKey(dto.shippingMethodId))
    return ShippingRateSchema.parse(saved)
  }

  static async updateRate(tenantId: string, rateId: string, dto: UpdateShippingRateDTO): Promise<ShippingRate> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingRateEntity)
    const row = await repo.findOne({ where: { tenantId, shippingRateId: rateId } })
    if (!row) throw new Error(PAYMENT_SHIPPING_MESSAGES.RATE_NOT_FOUND)

    PaymentShippingService.assertRanges(
      dto.minWeight ?? row.minWeight, dto.maxWeight ?? row.maxWeight,
      dto.minSubtotal ?? row.minSubtotal, dto.maxSubtotal ?? row.maxSubtotal,
    )

    Object.assign(row, dto)
    const saved = await repo.save(row)
    await redis.del(methodKey(row.shippingMethodId))
    return ShippingRateSchema.parse(saved)
  }

  static async deleteRate(tenantId: string, rateId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ShippingRateEntity)
    const row = await repo.findOne({ where: { tenantId, shippingRateId: rateId } })
    if (!row) throw new Error(PAYMENT_SHIPPING_MESSAGES.RATE_NOT_FOUND)
    const methodId = row.shippingMethodId
    await repo.remove(row)
    await redis.del(methodKey(methodId))
  }

  // ============================================================================
  // Rate calculation engine — THE core method
  // ============================================================================

  /**
   * Calculate available shipping quotes for a cart.
   *
   * Algorithm:
   *   1. Load every active (non-deleted) shipping method for the tenant.
   *   2. Load every active rate for those methods.
   *   3. For each rate, keep it only if it MATCHES the cart:
   *        - countryCode: rate.countryCode is null (any) OR equals dto.countryCode
   *        - region:      rate.region is null (any) OR equals dto.region
   *        - weight:      within [minWeight, maxWeight] (null bound = unbounded).
   *                       If the cart has no weight, weight-bounded rates are skipped
   *                       only when a bound is actually set.
   *        - subtotal:    within [minSubtotal, maxSubtotal] (null bound = unbounded)
   *   4. Compute price: if freeThreshold is set and subtotal >= freeThreshold,
   *      the quote is free (price 0, isFree true); otherwise rate.price.
   *   5. Group matches by method and keep the cheapest quote per method.
   *   6. Return quotes sorted ascending by price.
   */
  static async calculateShipping(tenantId: string, dto: CalculateShippingDTO): Promise<ShippingQuote[]> {
    try {
      const ds = await tenantDataSourceFor(tenantId)

      const methods = await ds.getRepository(ShippingMethodEntity).find({
        where: { tenantId, isActive: true },
      })
      if (methods.length === 0) return []

      const rates = await ds.getRepository(ShippingRateEntity).find({
        where: { tenantId, isActive: true },
      })

      // methodId -> method, for quick lookup while iterating rates.
      const methodById = new Map(methods.map((m) => [m.shippingMethodId, m]))

      // Keep the cheapest matching quote per method.
      const cheapestByMethod = new Map<string, ShippingQuote>()

      for (const rate of rates) {
        const method = methodById.get(rate.shippingMethodId)
        if (!method) continue // rate belongs to an inactive/deleted method

        if (!PaymentShippingService.rateMatches(rate, dto)) continue

        // Free-shipping threshold: at/above it, shipping costs nothing.
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

      // One cheapest quote per method, sorted ascending by price.
      return Array.from(cheapestByMethod.values()).sort((a, b) => a.price - b.price)
    } catch (error) {
      Logger.error(`${PAYMENT_SHIPPING_MESSAGES.CALCULATION_FAILED}: ${error}`)
      throw new Error(PAYMENT_SHIPPING_MESSAGES.CALCULATION_FAILED)
    }
  }

  // ============================================================================
  // Internals
  // ============================================================================

  /** Returns true when a rate is applicable to the given cart context. */
  private static rateMatches(rate: ShippingRateEntity, dto: CalculateShippingDTO): boolean {
    // Country: null on the rate means "any country".
    if (rate.countryCode != null && dto.countryCode != null && rate.countryCode !== dto.countryCode) return false
    if (rate.countryCode != null && dto.countryCode == null) return false

    // Region: null on the rate means "any region".
    if (rate.region != null && dto.region != null && rate.region !== dto.region) return false
    if (rate.region != null && dto.region == null) return false

    // Weight bounds (null = unbounded). A bounded rate needs a cart weight to compare.
    if (rate.minWeight != null) {
      if (dto.weight == null || dto.weight < Number(rate.minWeight)) return false
    }
    if (rate.maxWeight != null) {
      if (dto.weight == null || dto.weight > Number(rate.maxWeight)) return false
    }

    // Subtotal bounds (null = unbounded). Subtotal is always present on the cart.
    if (rate.minSubtotal != null && dto.subtotal < Number(rate.minSubtotal)) return false
    if (rate.maxSubtotal != null && dto.subtotal > Number(rate.maxSubtotal)) return false

    return true
  }

  /** Validates that min bounds do not exceed their max counterparts. */
  private static assertRanges(
    minWeight?: number | null, maxWeight?: number | null,
    minSubtotal?: number | null, maxSubtotal?: number | null,
  ): void {
    if (minWeight != null && maxWeight != null && Number(minWeight) > Number(maxWeight)) {
      throw new Error(PAYMENT_SHIPPING_MESSAGES.INVALID_WEIGHT_RANGE)
    }
    if (minSubtotal != null && maxSubtotal != null && Number(minSubtotal) > Number(maxSubtotal)) {
      throw new Error(PAYMENT_SHIPPING_MESSAGES.INVALID_SUBTOTAL_RANGE)
    }
  }
}
