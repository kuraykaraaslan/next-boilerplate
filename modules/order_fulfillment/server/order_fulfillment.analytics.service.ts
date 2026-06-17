import 'reflect-metadata'
import { Between } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { Fulfillment as FulfillmentEntity } from './entities/fulfillment.entity'
import type { FulfillmentAnalytics } from './order_fulfillment.types'
import type { AnalyticsQuery } from './order_fulfillment.dto'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

const HOUR_MS = 1000 * 60 * 60

/** Customs declaration (CN22 ≤ value threshold, else CN23 / commercial invoice). */
export interface CustomsDeclaration {
  type: 'CN22' | 'CN23'
  originCountry: string | null
  declaredValue: number | null
  currency: string | null
  totalWeightKg: number | null
  contents: Array<{
    description: string
    quantity: number
    hsCode: string | null
    countryOfOrigin: string | null
    unitValue: number | null
    lineValue: number | null
  }>
  dangerousGoods: Array<{ description: string; hazmatClass: string; unNumber: string | null }>
}

export default class OrderFulfillmentAnalyticsService {

  // ── Customs / export documentation ─────────────────────────────────────────

  /**
   * Build a structured customs declaration from a fulfillment + its items.
   * CN22 is used for low-value postal items (≤ €1000 equivalent threshold),
   * CN23 otherwise. This is real, usable structured output — the route/PDF layer
   * renders it; nothing here is faked.
   */
  static buildCustomsDeclaration(
    fulfillment: { originCountry?: string | null; declaredValue?: number | null; customsCurrency?: string | null; weightKg?: number | null },
    items: Array<{ name: string; quantity: number; hsCode?: string | null; countryOfOrigin?: string | null; unitValue?: number | null; isDangerousGoods?: boolean; hazmatClass?: string | null; unNumber?: string | null }>,
  ): CustomsDeclaration {
    const contents = items.map((it) => ({
      description: it.name,
      quantity: it.quantity,
      hsCode: it.hsCode ?? null,
      countryOfOrigin: it.countryOfOrigin ?? fulfillment.originCountry ?? null,
      unitValue: it.unitValue ?? null,
      lineValue: it.unitValue != null ? Math.round(it.unitValue * it.quantity * 100) / 100 : null,
    }))
    const declaredValue = fulfillment.declaredValue
      ?? (contents.every((c) => c.lineValue != null) ? contents.reduce((a, c) => a + (c.lineValue ?? 0), 0) : null)
    const dangerousGoods = items
      .filter((it) => it.isDangerousGoods)
      .map((it) => ({ description: it.name, hazmatClass: it.hazmatClass ?? 'UNSPECIFIED', unNumber: it.unNumber ?? null }))
    return {
      type: (declaredValue ?? 0) > 1000 ? 'CN23' : 'CN22',
      originCountry: fulfillment.originCountry ?? null,
      declaredValue,
      currency: fulfillment.customsCurrency ?? null,
      totalWeightKg: fulfillment.weightKg ?? null,
      contents,
      dangerousGoods,
    }
  }

  /** Validate dangerous-goods completeness for a set of items. */
  static assertDangerousGoodsComplete(
    items: Array<{ isDangerousGoods?: boolean; hazmatClass?: string | null; unNumber?: string | null }>,
  ): void {
    const bad = items.some((it) => it.isDangerousGoods && (!it.hazmatClass || it.hazmatClass === 'NONE' || !it.unNumber))
    if (bad) throw new AppError(ORDER_FULFILLMENT_MESSAGES.DANGEROUS_GOODS_INCOMPLETE, 422, ErrorCode.VALIDATION_ERROR)
  }

  // ── SLA ────────────────────────────────────────────────────────────────────

  /** True when the shipment is overdue against its promised delivery date. */
  static isSlaBreached(f: { estimatedDeliveryAt?: Date | null; deliveredAt?: Date | null; status: string }, now = new Date()): boolean {
    if (!f.estimatedDeliveryAt) return false
    if (f.deliveredAt) return f.deliveredAt > f.estimatedDeliveryAt
    if (['CANCELLED', 'RETURNED'].includes(f.status)) return false
    return now > new Date(f.estimatedDeliveryAt)
  }

  /** List open shipments past their promised delivery date. */
  static async listSlaBreaches(tenantId: string): Promise<string[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(FulfillmentEntity).find({ where: { tenantId } })
    const now = new Date()
    return rows.filter((r) => this.isSlaBreached(r as never, now)).map((r) => r.fulfillmentId)
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  static async getAnalytics(tenantId: string, query: AnalyticsQuery = {}): Promise<FulfillmentAnalytics> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.from && query.to) where.createdAt = Between(query.from, query.to)
    const rows = await ds.getRepository(FulfillmentEntity).find({ where })

    const total = rows.length
    const delivered = rows.filter((r) => r.status === 'DELIVERED').length
    const cancelled = rows.filter((r) => r.status === 'CANCELLED').length
    const returned = rows.filter((r) => r.status === 'RETURNED').length

    const shipDurations: number[] = []
    const deliverDurations: number[] = []
    let onTime = 0, onTimeEligible = 0

    const carrierMap = new Map<string, { total: number; delivered: number; onTime: number; onTimeEligible: number }>()
    const countryMap = new Map<string, { total: number; delivered: number }>()

    for (const r of rows) {
      if (r.shippedAt) shipDurations.push((r.shippedAt.getTime() - r.createdAt.getTime()) / HOUR_MS)
      if (r.deliveredAt && r.shippedAt) deliverDurations.push((r.deliveredAt.getTime() - r.shippedAt.getTime()) / HOUR_MS)
      if (r.deliveredAt && r.estimatedDeliveryAt) {
        onTimeEligible++
        if (r.deliveredAt <= r.estimatedDeliveryAt) onTime++
      }

      const ck = r.carrier ?? 'UNKNOWN'
      const c = carrierMap.get(ck) ?? { total: 0, delivered: 0, onTime: 0, onTimeEligible: 0 }
      c.total++
      if (r.status === 'DELIVERED') c.delivered++
      if (r.deliveredAt && r.estimatedDeliveryAt) { c.onTimeEligible++; if (r.deliveredAt <= r.estimatedDeliveryAt) c.onTime++ }
      carrierMap.set(ck, c)

      const dk = r.originCountry ?? 'UNKNOWN'
      const d = countryMap.get(dk) ?? { total: 0, delivered: 0 }
      d.total++
      if (r.status === 'DELIVERED') d.delivered++
      countryMap.set(dk, d)
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
    const rate = (n: number) => total ? Math.round((n / total) * 1000) / 10 : 0

    return {
      total, delivered, cancelled, returned,
      deliveryRate: rate(delivered),
      cancellationRate: rate(cancelled),
      returnRate: rate(returned),
      avgHoursToShip: avg(shipDurations),
      avgHoursToDeliver: avg(deliverDurations),
      onTimeDeliveryRate: onTimeEligible ? Math.round((onTime / onTimeEligible) * 1000) / 10 : null,
      byCarrier: [...carrierMap.entries()].map(([carrier, v]) => ({
        carrier, total: v.total, delivered: v.delivered,
        onTimeRate: v.onTimeEligible ? Math.round((v.onTime / v.onTimeEligible) * 1000) / 10 : null,
      })),
      byDestinationCountry: [...countryMap.entries()].map(([country, v]) => ({ country, total: v.total, delivered: v.delivered })),
    }
  }
}
