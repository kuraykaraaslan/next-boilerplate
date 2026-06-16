import type { CurrencyCode } from '@nb/common'

/**
 * Mid-period plan-change proration arithmetic. Stripe pre-computes prorated
 * line items on its side (`proration_behavior: 'create_prorations'`) and
 * surfaces them as line items in `invoice.payment_succeeded` payloads — we
 * just capture them as `InvoiceLine.sourceType='proration'` rows for audit.
 *
 * For provider-agnostic flows (PayPal / Iyzico mid-period switches), use
 * `calculateProration()` locally and pass the result as an `InvoiceLineInput`.
 */
export interface ProrationParams {
  /** Price of the plan the customer is leaving, monthly equivalent. */
  currentPlanMonthlyPrice: number;
  /** Price of the plan they're moving to, monthly equivalent. */
  newPlanMonthlyPrice: number;
  /** Days remaining in the current billing period at switch time. */
  daysRemainingInPeriod: number;
  /** Length of a full billing period (28–31 for monthly, 365 for yearly). */
  daysInFullPeriod: number;
  currency: CurrencyCode;
}

export interface ProrationResult {
  /** What we owe the customer for unused time on the old plan (≥ 0). */
  creditAmount: number;
  /** What we charge for the new plan up to the period end (≥ 0). */
  chargeAmount: number;
  /** Net (charge - credit). Positive ⇒ customer owes; negative ⇒ refund/credit balance. */
  netAmount: number;
  currency: CurrencyCode;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export default class PaymentProrationService {
  static calculateProration(params: ProrationParams): ProrationResult {
    const ratio = Math.max(0, Math.min(1, params.daysRemainingInPeriod / params.daysInFullPeriod));
    const creditAmount = round4(params.currentPlanMonthlyPrice * ratio);
    const chargeAmount = round4(params.newPlanMonthlyPrice * ratio);
    return {
      creditAmount,
      chargeAmount,
      netAmount: round4(chargeAmount - creditAmount),
      currency: params.currency,
    };
  }

  /**
   * Convert a proration result into one or two `InvoiceLine`-shaped inputs
   * ready to pass to `InvoiceService.create({ lines: [...] })`.
   */
  static prorationLines(params: {
    fromPlanName: string;
    toPlanName: string;
    proration: ProrationResult;
    taxRate?: number;
  }): Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    sourceType: 'proration';
    sourceId?: string;
  }> {
    const out: Array<{
      description: string; quantity: number; unitPrice: number; taxRate: number;
      sourceType: 'proration'; sourceId?: string;
    }> = [];
    const taxRate = params.taxRate ?? 0;
    if (params.proration.creditAmount > 0) {
      out.push({
        description: `Credit for unused time on ${params.fromPlanName}`,
        quantity: 1,
        unitPrice: -params.proration.creditAmount,
        taxRate,
        sourceType: 'proration',
      });
    }
    if (params.proration.chargeAmount > 0) {
      out.push({
        description: `Prorated charge for ${params.toPlanName} (remaining period)`,
        quantity: 1,
        unitPrice: params.proration.chargeAmount,
        taxRate,
        sourceType: 'proration',
      });
    }
    return out;
  }
}
