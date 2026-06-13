import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';
import { buildFatturaPaXml } from './it_fatturapa.builder';
import InvoiceSignatureService from '../invoice.signature.service';

/**
 * Italy — **FatturaPA via SdI**. We build the real FatturaElettronica 1.2 XML,
 * sign it (the SdI requires a digital signature — XAdES via the tenant's seal
 * cert when configured), and POST it to the tenant's configured intermediary
 * gateway (which forwards to the SdI). No mock: without a gateway we return
 * `noop`; a failed submission throws.
 */
export class ItFatturaPaAdapter implements InvoiceAdapter {
  readonly region = 'IT';

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await SettingService.getValue(tenantId, 'fatturapaGatewayUrl'));
  }

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [gatewayUrl, token, cfg, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'fatturapaGatewayUrl'),
      SettingService.getValue(tenantId, 'fatturapaGatewayToken'),
      SettingService.getByKeys(tenantId, ['fatturapaTransmitterCountry', 'fatturapaTransmitterCode', 'fatturapaCodiceDestinatario', 'fatturapaPecDestinatario', 'fatturapaFormat', 'fatturapaRegimeFiscale', 'companyProvince']),
      SettingService.getByKeys(tenantId, ['companyLegalName', 'companyTaxId', 'euVatNumber', 'companyAddressLine1', 'companyCity', 'companyPostalCode', 'companyCountryCode']),
    ]);

    if (!gatewayUrl) {
      Logger.info(`[ItFatturaPa] no gateway configured for ${invoice.invoiceNumber} → noop`);
      return { status: 'noop' };
    }

    const vat = (seller.euVatNumber ?? seller.companyTaxId ?? '').replace(/^IT/i, '');
    let xml = buildFatturaPaXml({
      invoice, lines,
      seller: {
        legalName: seller.companyLegalName ?? '',
        vatNumber: vat,
        countryCode: (seller.companyCountryCode ?? 'IT').toUpperCase(),
        taxCode: seller.companyTaxId ?? undefined,
        addressLine: seller.companyAddressLine1 ?? '',
        city: seller.companyCity ?? '',
        postalCode: seller.companyPostalCode ?? '',
        province: cfg.companyProvince ?? undefined,
        regimeFiscale: cfg.fatturapaRegimeFiscale ?? 'RF01',
      },
      config: {
        transmitterCountry: cfg.fatturapaTransmitterCountry ?? (seller.companyCountryCode ?? 'IT').toUpperCase(),
        transmitterCode: cfg.fatturapaTransmitterCode ?? vat,
        codiceDestinatario: cfg.fatturapaCodiceDestinatario ?? '0000000',
        pecDestinatario: cfg.fatturapaPecDestinatario ?? undefined,
        format: (cfg.fatturapaFormat as 'FPR12' | 'FPA12') ?? 'FPR12',
      },
    });

    // SdI requires a signed file; sign when a seal certificate is configured.
    const signed = await InvoiceSignatureService.signXmlIfConfigured(tenantId, xml);
    xml = signed.xml;

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`FatturaPA gateway ${res.status}: ${text.slice(0, 500)}`);

    let externalId: string | undefined;
    try { const j = JSON.parse(text) as { sdiId?: string; identificativoSdI?: string; id?: string }; externalId = j.sdiId ?? j.identificativoSdI ?? j.id; } catch { /* non-JSON */ }
    Logger.info(`[ItFatturaPa] submitted ${invoice.invoiceNumber} → ${externalId ?? '(no id)'} signed=${signed.signed}`);
    return { externalId, status: 'submitted', raw: { gateway: gatewayUrl, signed: signed.signed } };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[ItFatturaPa] cancel ${invoice.invoiceNumber} reason=${reason ?? '-'} — issue a nota di credito (TD04)`);
  }
}

export default ItFatturaPaAdapter;
