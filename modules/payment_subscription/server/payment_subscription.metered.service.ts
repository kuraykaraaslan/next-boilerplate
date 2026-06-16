import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { Subscription as SubscriptionEntity } from './entities/subscription.entity'
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages'

/**
 * Metered / usage-based billing. Usage units are accumulated per metric on the
 * subscription for the current period; at renewal the overage is priced with
 * per-metric rates and (by the caller) added as an invoice line, then reset.
 *
 * This service owns the usage ledger + charge computation; it does not itself
 * create invoices (that is the invoice module's job at renewal time).
 */
export interface MeteredRate {
  metric: string
  /** Price per unit in major currency units. */
  unitPrice: number
  /** Units included for free before overage is charged. */
  included?: number
}

export default class PaymentSubscriptionMeteredService {
  /** Record `quantity` usage units for a metric (accumulates within the period). */
  static async recordUsage(tenantId: string, subscriptionId: string, metric: string, quantity: number): Promise<Record<string, number>> {
    if (quantity <= 0) throw new AppError(SUBSCRIPTION_MESSAGES.INVALID_USAGE_QUANTITY, 422, ErrorCode.VALIDATION_ERROR)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const sub = await repo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const usage = { ...(sub.meteredUsage ?? {}) }
    usage[metric] = (usage[metric] ?? 0) + quantity
    sub.meteredUsage = usage
    await repo.save(sub)
    return usage
  }

  static async getUsage(tenantId: string, subscriptionId: string): Promise<Record<string, number>> {
    const ds = await tenantDataSourceFor(tenantId)
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return sub.meteredUsage ?? {}
  }

  /** Price the accumulated usage against per-metric rates (respects included units). */
  static async computeOverage(tenantId: string, subscriptionId: string, rates: MeteredRate[]): Promise<{ total: number; lines: Array<{ metric: string; billableUnits: number; amount: number }> }> {
    const usage = await this.getUsage(tenantId, subscriptionId)
    const lines = rates.map((r) => {
      const used = usage[r.metric] ?? 0
      const billableUnits = Math.max(0, used - (r.included ?? 0))
      const amount = Math.round(billableUnits * r.unitPrice * 100) / 100
      return { metric: r.metric, billableUnits, amount }
    })
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
    return { total, lines }
  }

  /** Reset the usage ledger (call after the overage has been invoiced at renewal). */
  static async resetUsage(tenantId: string, subscriptionId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(SubscriptionEntity).update({ tenantId, subscriptionId }, { meteredUsage: {} })
  }
}
