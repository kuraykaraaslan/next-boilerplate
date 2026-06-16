import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { Payment as PaymentEntity } from './entities/payment.entity'

export interface PaymentAnalytics {
  from: string
  to: string
  /** Checkout sessions created in the window. */
  created: number
  completed: number
  failed: number
  refunded: number
  /** completed / created. */
  conversionRate: number
  /** Gross completed amount, grouped by currency. */
  revenueByCurrency: Record<string, number>
}

/**
 * Conversion + revenue analytics over a time window, computed from the payments
 * table (no extra tracking store). Powers a dashboard: how many checkouts were
 * created vs completed, the conversion rate, and gross revenue per currency.
 */
export default class PaymentSellAnalyticsService {
  static async getAnalytics(tenantId: string, opts: { from?: Date; to?: Date } = {}): Promise<PaymentAnalytics> {
    const to = opts.to ?? new Date()
    const from = opts.from ?? new Date(to.getTime() - 30 * 86_400_000)

    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)
    const rows = await repo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.createdAt BETWEEN :from AND :to', { from, to })
      .getMany()

    let completed = 0
    let failed = 0
    let refunded = 0
    const revenueByCurrency: Record<string, number> = {}
    for (const p of rows) {
      if (p.status === 'COMPLETED' || p.status === 'PARTIALLY_REFUNDED') {
        completed += 1
        const cur = (p.currency || 'USD').toUpperCase()
        revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + (Number(p.amount) - Number(p.refundedAmount ?? 0))
      }
      if (p.status === 'FAILED') failed += 1
      if (p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED') refunded += 1
    }
    const created = rows.length
    const conversionRate = created > 0 ? Math.round((completed / created) * 10000) / 10000 : 0

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      created,
      completed,
      failed,
      refunded,
      conversionRate,
      revenueByCurrency,
    }
  }
}
