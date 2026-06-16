import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';

export interface InvoiceAdapterSubmitResult {
  /** Provider's external document ID (GİB UUID, Peppol document ID, Stripe tax calc, …). */
  externalId?: string;
  /** Normalised status across providers. */
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'noop';
  /** When the provider returns a signed/legal PDF, its public URL. */
  pdfUrl?: string;
  /** Provider-specific raw response for audit logs. */
  raw?: unknown;
}

/**
 * Contract every regional e-invoicing adapter must satisfy. The adapter is
 * responsible for translating our internal `Invoice` + `InvoiceLine` rows
 * into whatever the local authority demands (UBL-TR for GİB, Peppol BIS for
 * EU access points, Stripe Tax for US, …) and submitting them.
 *
 * Adapters are constructed once (in `registry.ts`) and shared across tenants;
 * tenant-specific config is read inside each call via `SettingService`.
 */
export interface InvoiceAdapter {
  /** 'TR' | 'EU' | 'US' | 'OTHER' */
  readonly region: string;

  /** Tenant has filled in the per-region settings required to call submit(). */
  isConfigured(tenantId: string): Promise<boolean>;

  /**
   * Push the invoice to the regional authority / e-invoicing network. Should
   * be idempotent on `(tenantId, invoiceId)` — re-submission is allowed and
   * must not create duplicate documents.
   */
  submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult>;

  /** Cancel a previously-submitted document (returns to draft / void on our side). */
  cancel(tenantId: string, invoice: Invoice, reason?: string): Promise<void>;
}
