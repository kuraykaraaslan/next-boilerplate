import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service'
import { Subscription as SubscriptionEntity } from './entities/subscription.entity'
import PaymentSubscriptionLifecycleService from './payment_subscription.lifecycle.service'

/**
 * Dunning lifecycle for failed renewal charges: a configurable retry schedule
 * with escalation. Each failed charge increments `pastDueCount` (via
 * `markPastDue`); a scheduled `runDunningCycle` decides, per past-due
 * subscription, whether to send another retry/reminder or — once the max
 * attempts are exhausted — cancel the subscription. Recovery (a later
 * successful charge) clears the state via `recordRecovery`.
 */
export default class PaymentSubscriptionDunningService {
  /** Per-tenant dunning policy. */
  private static async policy(tenantId: string): Promise<{ maxAttempts: number; retryDays: number[] }> {
    const [maxRaw, daysRaw] = await Promise.all([
      SettingService.getValue(tenantId, 'dunningMaxAttempts').catch(() => null),
      SettingService.getValue(tenantId, 'dunningRetryDays').catch(() => null),
    ])
    const maxAttempts = maxRaw && parseInt(maxRaw, 10) > 0 ? parseInt(maxRaw, 10) : 4
    const retryDays = daysRaw
      ? daysRaw.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0)
      : [1, 3, 5, 7]
    return { maxAttempts, retryDays }
  }

  /** Record a failed renewal charge → mark past-due and emit a dunning event. */
  static async recordFailedPayment(tenantId: string, subscriptionId: string): Promise<void> {
    const sub = await PaymentSubscriptionLifecycleService.markPastDue(tenantId, subscriptionId)
    await WebhookService.dispatchEvent(tenantId, 'subscription.past_due', {
      subscriptionId, pastDueCount: sub.pastDueCount ?? 1, dunning: true,
    }).catch(() => {})
  }

  /** Clear dunning state after a successful retry. */
  static async recordRecovery(tenantId: string, subscriptionId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const sub = await repo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub || sub.status !== 'PAST_DUE') return
    sub.status = 'ACTIVE'
    sub.pastDueCount = 0
    await repo.save(sub)
    await WebhookService.dispatchEvent(tenantId, 'subscription.resumed', { subscriptionId, recovered: true }).catch(() => {})
  }

  /**
   * Run one dunning pass for a tenant: cancel subscriptions that have exhausted
   * the retry budget, leave the rest past-due for the next scheduled retry.
   * Returns counts. Intended for a daily scheduled job.
   */
  static async runDunningCycle(tenantId: string): Promise<{ cancelled: number; pending: number }> {
    const { maxAttempts } = await this.policy(tenantId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const pastDue = await repo.find({ where: { tenantId, status: 'PAST_DUE' } })

    let cancelled = 0
    let pending = 0
    for (const sub of pastDue) {
      if ((sub.pastDueCount ?? 0) >= maxAttempts) {
        await PaymentSubscriptionLifecycleService.cancelSubscription(tenantId, sub.subscriptionId, {
          cancelAtPeriodEnd: false,
          reason: 'dunning_exhausted',
        }).catch((err) => Logger.warn(`[dunning] cancel failed for ${sub.subscriptionId}: ${err instanceof Error ? err.message : String(err)}`))
        cancelled += 1
      } else {
        pending += 1
      }
    }
    if (pastDue.length) Logger.info(`[dunning] tenant ${tenantId}: ${cancelled} cancelled, ${pending} awaiting retry`)
    return { cancelled, pending }
  }
}
