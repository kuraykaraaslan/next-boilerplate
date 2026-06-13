import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { buildCiiInvoiceXml } from './cii_xml';
import InvoiceSignatureService from '../invoice.signature.service';

/**
 * France — **Chorus Pro / Factur-X** (UN/CEFACT CII, same syntax as ZUGFeRD).
 * B2G is mandatory via Chorus Pro; B2B mandate is rolling out. We build the
 * real Factur-X CII, optionally sign it, and POST it to the tenant's configured
 * Chorus Pro API endpoint. No mock: without an endpoint we return `noop`; a
 * failed call throws.
 */
export class FrChorusProAdapter implements InvoiceAdapter {
  readonly region = 'FR';

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await SettingService.getValue(tenantId, 'chorusProGatewayUrl'));
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [gatewayUrl, token, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'chorusProGatewayUrl'),
      SettingService.getValue(tenantId, 'chorusProToken'),
      SettingService.getByKeys(tenantId, ['companyLegalName', 'companyTaxId', 'euVatNumber', 'companyAddressLine1', 'companyCity', 'companyPostalCode', 'companyCountryCode']),
    ]);

    if (!gatewayUrl) {
      Logger.info(`[FrChorusPro] no gateway configured for ${invoice.invoiceNumber} → noop`);
      return { status: 'noop' };
    }

    let xml = buildCiiInvoiceXml({
      invoice, lines,
      profile: 'EXTENDED',
      seller: {
        name: seller.companyLegalName ?? '',
        vatNumber: seller.euVatNumber ?? seller.companyTaxId ?? '',
        taxId: seller.companyTaxId ?? '',
        addressLine: seller.companyAddressLine1 ?? '',
        city: seller.companyCity ?? '',
        postalCode: seller.companyPostalCode ?? '',
        countryCode: (seller.companyCountryCode ?? 'FR').toUpperCase(),
      },
    });
    ({ xml } = await InvoiceSignatureService.signXmlIfConfigured(tenantId, xml));

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Chorus Pro ${res.status}: ${text.slice(0, 500)}`);

    let externalId: string | undefined;
    try { externalId = (JSON.parse(text) as { idFacture?: string; id?: string }).idFacture; } catch { /* non-JSON */ }
    Logger.info(`[FrChorusPro] submitted ${invoice.invoiceNumber} → ${externalId ?? '(no id)'}`);
    return { externalId, status: 'submitted', raw: { gateway: gatewayUrl } };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[FrChorusPro] cancel ${invoice.invoiceNumber} reason=${reason ?? '-'} — issue an avoir (credit note)`);
  }
}

export default FrChorusProAdapter;
