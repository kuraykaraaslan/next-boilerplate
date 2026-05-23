import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';

/**
 * US — there's no federal e-invoicing mandate, so `submit()` is a no-op.
 * Sales tax is computed via Stripe Tax (if enabled in tenant settings); the
 * resulting `tax.calculations.create` id is captured for audit.
 */
export class UsStandardAdapter implements InvoiceAdapter {
  readonly region = 'US';

  async isConfigured(_tenantId: string): Promise<boolean> {
    // Always configured — even without Stripe Tax, we can still issue a
    // generic PDF receipt. The only "config" question is whether Stripe Tax
    // is on, which only affects the tax calculation, not document validity.
    return true;
  }

  async submit(tenantId: string, invoice: Invoice, _lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const stripeTaxEnabled = (await SettingService.getValue(tenantId, 'stripeTaxEnabled')) === 'true';

    if (stripeTaxEnabled) {
      // Real impl: stripe.tax.calculations.create({...}) → store calculation_id
      Logger.info(`[UsStandard:mock] Stripe Tax calc for ${invoice.invoiceNumber}`);
      return {
        externalId: `txcalc_mock_${invoice.invoiceId.slice(0, 8)}`,
        status: 'accepted',
        raw: { provider: 'stripe-tax', mock: true },
      };
    }

    Logger.info(`[UsStandard] no-op submit for ${invoice.invoiceNumber} (Stripe Tax disabled)`);
    return { status: 'noop' };
  }

  async cancel(_tenantId: string, _invoice: Invoice, _reason?: string): Promise<void> {
    /* No external submission to cancel — local void is enough. */
  }
}

export default UsStandardAdapter;

/** US Employer Identification Number — `XX-XXXXXXX`. */
export function isValidEin(ein: string): boolean {
  return /^\d{2}-?\d{7}$/.test(ein.trim());
}

export function isValidUsZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}
