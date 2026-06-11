import type { CurrencyCode } from '@/modules/common'
import type { ProrationPreview } from './payment_subscription.types'
import type { BillingCycle } from './payment_subscription.enums'

export const CYCLE_DAYS: Record<BillingCycle, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 91,
  YEARLY: 365,
}

export default class ProrationService {

  static preview(
    currentAmount: number,
    newAmount: number,
    billingCycle: BillingCycle,
    periodStart: Date,
    periodEnd: Date,
    currency: CurrencyCode,
  ): ProrationPreview {
    const now = new Date()
    const totalMs = periodEnd.getTime() - periodStart.getTime()
    const usedMs = now.getTime() - periodStart.getTime()
    const remainingFraction = Math.max(0, (totalMs - usedMs) / totalMs)

    const unusedCredit = +(currentAmount * remainingFraction).toFixed(2)
    const newCycleCharge = newAmount
    const immediateCharge = +(Math.max(0, newCycleCharge - unusedCredit)).toFixed(2)

    return {
      unusedCredit,
      newCycleCharge,
      immediateCharge,
      currency,
      prorationDate: now,
    }
  }

  static nextPeriodEnd(from: Date, cycle: BillingCycle): Date {
    const d = new Date(from)
    switch (cycle) {
      case 'DAILY': d.setDate(d.getDate() + 1); break
      case 'WEEKLY': d.setDate(d.getDate() + 7); break
      case 'MONTHLY': d.setMonth(d.getMonth() + 1); break
      case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break
      case 'YEARLY': d.setFullYear(d.getFullYear() + 1); break
    }
    return d
  }
}
