import 'reflect-metadata';
import { PaymentTaxService } from '@/modules/payment_tax';
import Logger from '@/modules/logger';

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

export interface InvoiceTaxInputLine {
  /** Stable per-line key (we use the line index). */
  reference: string;
  /** Unit price (net or gross depending on the rate's `includedInPrice`). */
  amount: number;
  quantity: number;
  /** Optional tax class code (STANDARD / REDUCED / DIGITAL / …). */
  taxClassCode?: string;
}

export interface InvoiceTaxDestination {
  countryCode?: string;
  region?: string;
  postalCode?: string;
}

export interface InvoiceTaxLineResult {
  reference: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  /** Effective blended rate as a decimal (0.20 = 20%), for the line entity. */
  effectiveRate: number;
}

export interface InvoiceTaxResult {
  currency: string;
  subtotalNet: number;
  totalTax: number;
  totalGross: number;
  appliedRates: number;
  lines: InvoiceTaxLineResult[];
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

      return {
        currency: result.currency,
        subtotalNet: result.subtotalNet,
        totalTax: result.totalTax,
        totalGross: result.totalGross,
        appliedRates: result.appliedRates,
        lines: result.lines.map((l) => ({
          reference: l.reference,
          netAmount: l.netAmount,
          taxAmount: l.taxAmount,
          grossAmount: l.grossAmount,
          effectiveRate: l.netAmount > 0 ? Math.round((l.taxAmount / l.netAmount) * 10000) / 10000 : 0,
        })),
      };
    } catch (err) {
      Logger.warn(`[Invoice.tax] payment_tax engine failed (fail-open): ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
