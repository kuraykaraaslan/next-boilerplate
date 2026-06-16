import Logger from '@nb/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from '@nb/invoice/server/adapters/base.adapter';
import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';

/**
 * US — there's no federal e-invoicing mandate, so `submit()` is a no-op.
 *
 * Sales tax is computed natively by the tenant's own `payment_tax` engine at
 * invoice-creation time (destination-matched state/postal rates), not by an
 * external provider. The previous Stripe Tax integration was a mock that
 * returned a synthetic calculation id; it has been removed so the platform
 * does not advertise a tax calculation that never happened. Tenants needing
 * Stripe Tax can add it as an optional `payment_tax` rate source later.
 */
export class UsStandardAdapter implements InvoiceAdapter {
  readonly region = 'US';

  async isConfigured(_tenantId: string): Promise<boolean> {
    // Always "configured" — a generic PDF receipt can always be issued; tax is
    // handled by payment_tax, not by any US-specific submission flow.
    return true;
  }

  async submit(_tenantId: string, invoice: Invoice, _lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    Logger.info(`[UsStandard] no-op submit for ${invoice.invoiceNumber} (tax via payment_tax)`);
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
