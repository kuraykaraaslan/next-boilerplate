import SettingService from '@nb/setting/server/setting.service';
import Logger from '@nb/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { buildGstEInvoice } from './in_gst.builder';

/**
 * India — **GST e-invoice (IRP)**. We build the real IRP JSON (schema 1.1) and
 * POST it to the tenant's configured IRP/GSP endpoint, which validates it and
 * returns the IRN + signed QR code. No mock: without an endpoint we return
 * `noop`; a failed registration throws. We never invent an IRN.
 */
export class InGstAdapter implements InvoiceAdapter {
  readonly region = 'IN';

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await SettingService.getValue(tenantId, 'gstIrpUrl'));
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [irpUrl, token, cfg, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'gstIrpUrl'),
      SettingService.getValue(tenantId, 'gstIrpToken'),
      SettingService.getByKeys(tenantId, ['gstGstin', 'gstStateCode']),
      SettingService.getByKeys(tenantId, ['companyLegalName', 'companyAddressLine1', 'companyCity', 'companyPostalCode']),
    ]);

    if (!irpUrl) {
      Logger.info(`[InGst] no IRP configured for ${invoice.invoiceNumber} → noop`);
      return { status: 'noop' };
    }

    const payload = buildGstEInvoice({
      invoice, lines,
      supplier: {
        gstin: cfg.gstGstin ?? '',
        legalName: seller.companyLegalName ?? '',
        addressLine: seller.companyAddressLine1 ?? '',
        city: seller.companyCity ?? '',
        pincode: seller.companyPostalCode ?? '',
        stateCode: cfg.gstStateCode ?? (cfg.gstGstin ?? '').slice(0, 2),
      },
    });

    const res = await fetch(irpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`GST IRP ${res.status}: ${text.slice(0, 500)}`);

    let irn: string | undefined;
    try { const j = JSON.parse(text) as { Irn?: string; irn?: string; data?: { Irn?: string } }; irn = j.Irn ?? j.irn ?? j.data?.Irn; } catch { /* non-JSON */ }
    Logger.info(`[InGst] registered ${invoice.invoiceNumber} → IRN ${irn ?? '(none)'}`);
    return { externalId: irn, status: irn ? 'accepted' : 'submitted', raw: { irp: irpUrl } };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[InGst] cancel ${invoice.invoiceNumber} reason=${reason ?? '-'} — IRN cancellation allowed within 24h, then issue a credit note`);
  }
}

export default InGstAdapter;
