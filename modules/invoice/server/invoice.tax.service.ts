import 'reflect-metadata';
import { PaymentTaxService, type TaxLine, type CalculateTaxDTO } from '@kuraykaraaslan/payment_tax';
import Logger from '@kuraykaraaslan/logger';

/**
 * Bridges the invoice module to the tenant's own tax engine (`payment_tax`).
 *
 * Rather than relying on a single hardcoded `invoiceDefaultVatRate` or an
 * external provider (Stripe Tax), each line is priced through
 * `PaymentTaxService.calculateTax()`, which resolves the tenant's own
 * destination-matched `tax_rates` (country / region / postal), supporting
 * compound and price-inclusive rates. This is the single source of truth for
 * VAT / KDV / sales tax across every billing region.
 *
 * The engine is *opt-in via data*: if a tenant has not configured any matching
 * tax rate, `calculateTax` yields zero tax and `appliedRates === 0`, in which
 * case the caller falls back to its legacy per-line rate. All failures are
 * fail-open (return `null`) so a tax-engine outage never blocks invoicing.
 */

// Reuse the payment_tax engine's canonical input shapes instead of redeclaring
// them — one source of truth for the tax DTO. `amount` may be net or gross
// depending on the matched rate's `includedInPrice`.
export type InvoiceTaxInputLine = CalculateTaxDTO['lines'][number];
export type InvoiceTaxDestination = CalculateTaxDTO['destination'];

export interface InvoiceTaxLineResult {
  reference: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  /** Effective blended rate as a decimal (0.20 = 20%), for the line entity. */
  effectiveRate: number;
  /** The individual taxes applied to this line (KDV, eco-fee, …) — preserved
   *  so multi-tax invoices can itemise each component. */
  taxes: TaxLine[];
}

/**
 * One row of the invoice's tax summary, grouped by rate — maps directly to a
 * UBL `cac:TaxSubtotal`, a CII `ram:ApplicableTradeTax`, or a FatturaPA
 * `DatiRiepilogo`. This is the legally-required per-rate breakdown that a single
 * blended rate cannot represent.
 */
export interface InvoiceTaxBreakdownEntry {
  /** Rate as a percentage (20 = 20%). */
  ratePercent: number;
  /** Net base the rate applies to. */
  taxableAmount: number;
  /** Tax charged at this rate. */
  taxAmount: number;
}

export interface InvoiceTaxResult {
  currency: string;
  subtotalNet: number;
  totalTax: number;
  totalGross: number;
  appliedRates: number;
  lines: InvoiceTaxLineResult[];
  /** Per-rate tax summary aggregated across all lines. */
  taxBreakdown: InvoiceTaxBreakdownEntry[];
}

export default class InvoiceTaxService {
  /**
   * Compute per-line tax via the tenant's `payment_tax` engine.
   * Returns `null` when the engine is unavailable or no rate applied, so the
   * caller can fall back to its manual rate path.
   */
  static async computeForLines(
    tenantId: string,
    params: { currency: string; destination: InvoiceTaxDestination; lines: InvoiceTaxInputLine[] },
  ): Promise<InvoiceTaxResult | null> {
    if (!params.lines.length) return null;

    try {
      const result = await PaymentTaxService.calculateTax(tenantId, {
        currency: params.currency,
        destination: {
          countryCode: params.destination.countryCode,
          region: params.destination.region,
          postalCode: params.destination.postalCode,
        },
        lines: params.lines.map((l) => ({
          reference: l.reference,
          amount: l.amount,
          quantity: l.quantity,
          taxClassCode: l.taxClassCode,
        })),
      });

      // No tenant rate matched — let the caller use its legacy default rate.
      if (!result || result.appliedRates === 0) return null;

      // Aggregate every line's individual taxes into a per-rate summary
      // (round2 so it ties out with the document totals).
      const byRate = new Map<number, { taxableAmount: number; taxAmount: number }>();
      for (const line of result.lines) {
        for (const t of line.taxes) {
          const bucket = byRate.get(t.rate) ?? { taxableAmount: 0, taxAmount: 0 };
          bucket.taxableAmount += t.taxableAmount;
          bucket.taxAmount += t.taxAmount;
          byRate.set(t.rate, bucket);
        }
      }
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const taxBreakdown: InvoiceTaxBreakdownEntry[] = [...byRate.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ratePercent, v]) => ({
          ratePercent,
          taxableAmount: round2(v.taxableAmount),
          taxAmount: round2(v.taxAmount),
        }));

      return {
        currency: result.currency,
        subtotalNet: result.subtotalNet,
        totalTax: result.totalTax,
        totalGross: result.totalGross,
        appliedRates: result.appliedRates,
        taxBreakdown,
        lines: result.lines.map((l) => ({
          reference: l.reference,
          netAmount: l.netAmount,
          taxAmount: l.taxAmount,
          grossAmount: l.grossAmount,
          effectiveRate: l.netAmount > 0 ? Math.round((l.taxAmount / l.netAmount) * 10000) / 10000 : 0,
          taxes: l.taxes,
        })),
      };
    } catch (err) {
      Logger.warn(`[Invoice.tax] payment_tax engine failed (fail-open): ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
