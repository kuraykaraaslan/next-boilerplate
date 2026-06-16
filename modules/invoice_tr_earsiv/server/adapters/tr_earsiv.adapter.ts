import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from '@nb/invoice/server/adapters/base.adapter';
import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { isConfigured, submit, cancel } from './tr_earsiv.submit';

/**
 * Turkey — e-Arşiv Fatura (B2C) and e-Fatura (B2B). Document shape is
 * identical (UBL-TR 2.1), only the document type code (`EARSIVFATURA` vs
 * `TICARIFATURA`) and the integrator endpoint differ.
 *
 * Real production deploys plug into one of these GİB-approved integrators:
 *   • Foriba (foriba.com)
 *   • Logo İnternet (e-logo.com.tr)
 *   • Uyumsoft (uyumsoft.com.tr)
 *   • BizPlace, eLogo, Mikrogep, ...
 *
 * This adapter ships a `mock` integrator that returns synthetic success and a
 * generated UBL-TR XML for inspection. The integrator submit/cancel flows, the
 * seller loader, and the UBL-TR / GİB-portal builders live in the sibling
 * `tr_earsiv.*` modules; this class is the thin `InvoiceAdapter` binding.
 */
export class TrEarsivAdapter implements InvoiceAdapter {
  readonly region = 'TR';

  isConfigured(tenantId: string): Promise<boolean> {
    return isConfigured(tenantId);
  }

  submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    return submit(tenantId, invoice, lines);
  }

  cancel(tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    return cancel(tenantId, invoice, reason);
  }
}

export default TrEarsivAdapter;
