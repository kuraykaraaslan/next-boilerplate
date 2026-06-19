import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { resolveSellerProfile } from './seller-profile';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/**
 * Host-facing facade that runs a regional e-invoicing adapter as a SANDBOXED
 * community plugin. Each op (isConfigured/submit/cancel) is forwarded JSON-in/
 * JSON-out into the isolate via a tenant-bound `invoke`. The isolate builds the
 * regional document (UBL/CII/FatturaPA/CFDI/…) and performs the egress itself;
 * the gateway/integrator credentials live in the plugin's encrypted secrets and
 * never enter the isolate, and trust-critical XAdES signing happens host-side via
 * `host.crypto.signXml`.
 *
 * The issuer ("seller") identity is TENANT-level config the isolate can't reach,
 * so the host resolves it (`resolveSellerProfile`) and passes it into every op.
 * Routing (`region`) comes from the manifest extension metadata `code`.
 */
export class IsolatedInvoiceAdapter implements InvoiceAdapter {
  readonly region: string;
  private readonly invoke: Invoke;

  constructor(_key: string, meta: Record<string, unknown>, invoke: Invoke) {
    this.region = String((meta?.code as string) ?? (meta?.region as string) ?? '').toUpperCase();
    this.invoke = invoke;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.invoke('isConfigured', { seller: await resolveSellerProfile(tenantId) }));
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    return (await this.invoke('submit', {
      invoice,
      lines,
      seller: await resolveSellerProfile(tenantId),
    })) as InvoiceAdapterSubmitResult;
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    await this.invoke('cancel', { invoice, reason: reason ?? null });
  }
}
