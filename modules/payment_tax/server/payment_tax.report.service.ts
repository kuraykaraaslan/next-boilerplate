import 'reflect-metadata'
import { Between } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import { AuditLog } from '@nb/audit_log/server/entities/audit_log.entity'

/**
 * Period-based tax report. Every `calculateTax` writes a `tax.calculated` audit
 * entry (currency / subtotalNet / totalTax); this aggregates those over a date
 * range into a per-currency summary — no separate tax ledger required, and the
 * report is backed by the tamper-evident audit log.
 */
export interface TaxReportRow {
  currency: string
  taxableNet: number
  taxCollected: number
  calculations: number
}

export interface TaxReport {
  from: string
  to: string
  rows: TaxReportRow[]
}

export default class PaymentTaxReportService {
  static async getReport(tenantId: string, opts: { from?: Date; to?: Date } = {}): Promise<TaxReport> {
    const to = opts.to ?? new Date()
    const from = opts.from ?? new Date(to.getFullYear(), to.getMonth(), 1) // month-to-date default

    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(AuditLog).find({
      where: { tenantId, action: 'tax.calculated', createdAt: Between(from, to) },
    })

    const byCurrency = new Map<string, TaxReportRow>()
    for (const row of rows) {
      const md = (row.metadata ?? {}) as { currency?: string; subtotalNet?: number; totalTax?: number }
      const cur = (md.currency || 'USD').toUpperCase()
      const agg = byCurrency.get(cur) ?? { currency: cur, taxableNet: 0, taxCollected: 0, calculations: 0 }
      agg.taxableNet += Number(md.subtotalNet) || 0
      agg.taxCollected += Number(md.totalTax) || 0
      agg.calculations += 1
      byCurrency.set(cur, agg)
    }
    for (const agg of byCurrency.values()) {
      agg.taxableNet = Math.round(agg.taxableNet * 100) / 100
      agg.taxCollected = Math.round(agg.taxCollected * 100) / 100
    }

    return { from: from.toISOString(), to: to.toISOString(), rows: [...byCurrency.values()] }
  }
}
