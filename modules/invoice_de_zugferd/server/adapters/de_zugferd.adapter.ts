import SettingService from '@nb/setting/server/setting.service';
import Logger from '@nb/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from '@nb/invoice/server/adapters/base.adapter';
import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { buildCiiInvoiceXml, type CiiProfile } from '@nb/invoice/server/adapters/cii_xml';
import InvoiceSignatureService from '@nb/invoice/server/invoice.signature.service';

/**
 * Germany — **ZUGFeRD 2.x / XRechnung** (UN/CEFACT CII). We generate the real
 * CII XML. B2G in Germany is delivered over Peppol/XRechnung; B2B uses the
 * hybrid ZUGFeRD PDF (CII embedded in PDF/A-3 — the embedding step is a
 * rendering concern handled elsewhere). When a tenant configures
 * `zugferdGatewayUrl` we POST the CII to it; otherwise we return the generated
 * XML in `raw` for embedding and report `noop` (no fake transmission).
 */
export class DeZugferdAdapter implements InvoiceAdapter {
  readonly region = 'DE';

  async isConfigured(_tenantId: string): Promise<boolean> {
    // Always able to generate the document; transmission is optional.
    return true;
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [gatewayUrl, token, profileRaw, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'zugferdGatewayUrl'),
      SettingService.getValue(tenantId, 'zugferdGatewayToken'),
      SettingService.getValue(tenantId, 'zugferdProfile'),
      SettingService.getByKeys(tenantId, ['companyLegalName', 'companyTaxId', 'euVatNumber', 'companyAddressLine1', 'companyCity', 'companyPostalCode', 'companyCountryCode']),
    ]);

    let xml = buildCiiInvoiceXml({
      invoice, lines,
      profile: (profileRaw as CiiProfile) || 'EN16931',
      seller: {
        name: seller.companyLegalName ?? '',
        vatNumber: seller.euVatNumber ?? seller.companyTaxId ?? '',
        taxId: seller.companyTaxId ?? '',
        addressLine: seller.companyAddressLine1 ?? '',
        city: seller.companyCity ?? '',
        postalCode: seller.companyPostalCode ?? '',
        countryCode: (seller.companyCountryCode ?? 'DE').toUpperCase(),
      },
    });
    ({ xml } = await InvoiceSignatureService.signXmlIfConfigured(tenantId, xml));

    if (!gatewayUrl) {
      Logger.info(`[DeZugferd] generated CII for ${invoice.invoiceNumber} (no gateway → embed in PDF/A-3)`);
      return { status: 'noop', raw: { format: 'cii', xml } };
    }

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`ZUGFeRD gateway ${res.status}: ${text.slice(0, 500)}`);
    Logger.info(`[DeZugferd] submitted ${invoice.invoiceNumber}`);
    return { status: 'submitted', raw: { gateway: gatewayUrl, response: text.slice(0, 1000) } };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[DeZugferd] cancel ${invoice.invoiceNumber} reason=${reason ?? '-'} — issue a credit note (TypeCode 381)`);
  }
}

export default DeZugferdAdapter;
