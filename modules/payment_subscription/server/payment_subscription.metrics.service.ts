import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { Subscription as SubscriptionEntity } from './entities/subscription.entity'

/**
 * MRR / ARR — the core SaaS revenue metrics. Computed from currently-recurring
 * subscriptions by normalising each one's amount to a monthly figure based on
 * its billing cycle, grouped by currency (mixed-currency books are not summed
 * into one number — that would be wrong).
 */

// Monthly normalisation factor per billing cycle.
const MONTHLY_FACTOR: Record<string, number> = {
  WEEKLY: 52 / 12,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  SEMIANNUAL: 1 / 6,
  SEMI_ANNUAL: 1 / 6,
  ANNUAL: 1 / 12,
  YEARLY: 1 / 12,
}

// Statuses that represent live recurring revenue.
const RECURRING = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE'])

export interface RecurringRevenue {
  /** MRR per currency. */
  mrrByCurrency: Record<string, number>
  /** ARR per currency (MRR × 12). */
  arrByCurrency: Record<string, number>
  activeCount: number
}

export default class PaymentSubscriptionMetricsService {
  /**
   * @param opts.includeTrialing default false — exclude trials from MRR (common
   *   convention, since they are not yet paying).
   */
  static async getRecurringRevenue(tenantId: string, opts: { includeTrialing?: boolean } = {}): Promise<RecurringRevenue> {
    const ds = await tenantDataSourceFor(tenantId)
    const subs = await ds.getRepository(SubscriptionEntity).find({ where: { tenantId } })

    const mrrByCurrency: Record<string, number> = {}
    let activeCount = 0
    for (const s of subs) {
      if (!RECURRING.has(s.status)) continue
      if (s.status === 'TRIALING' && !opts.includeTrialing) continue
      const factor = MONTHLY_FACTOR[(s.billingCycle || 'MONTHLY').toUpperCase()] ?? 1
      const cur = (s.currency || 'USD').toUpperCase()
      mrrByCurrency[cur] = (mrrByCurrency[cur] ?? 0) + Number(s.amount) * factor
      activeCount += 1
    }

    const arrByCurrency: Record<string, number> = {}
    for (const [cur, mrr] of Object.entries(mrrByCurrency)) {
      mrrByCurrency[cur] = Math.round(mrr * 100) / 100
      arrByCurrency[cur] = Math.round(mrr * 12 * 100) / 100
    }
    return { mrrByCurrency, arrByCurrency, activeCount }
  }
}
