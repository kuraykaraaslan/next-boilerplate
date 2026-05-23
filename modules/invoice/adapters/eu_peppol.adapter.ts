import { randomUUID } from 'node:crypto';
import SettingService from '@/modules/setting/setting.service';
import Logger from '@/modules/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from './base.adapter';
import type { Invoice } from '../entities/invoice.entity';
import type { InvoiceLine } from '../entities/invoice_line.entity';

/**
 * EU — Peppol BIS Billing 3.0 (UBL 2.1 + EN 16931). Submission goes through
 * an Access Point operator chosen by the tenant. Mandatory for B2B/B2G in
 * Italy (FatturaPA via SDI), France (Chorus Pro), Germany (XRechnung),
 * Netherlands and Belgium; voluntary elsewhere.
 *
 * Cross-border B2C digital services follow VAT OSS rules — consumer's
 * country VAT rate applies. Use `getOssVatRate(countryCode)` for the rate.
 */
export class EuPeppolAdapter implements InvoiceAdapter {
  readonly region = 'EU';

  async isConfigured(tenantId: string): Promise<boolean> {
    const [endpointId, accessPointUrl] = await Promise.all([
      SettingService.getValue(tenantId, 'peppolEndpointId'),
      SettingService.getValue(tenantId, 'peppolAccessPointUrl'),
    ]);
    return Boolean(endpointId && accessPointUrl);
  }

  async submit(_tenantId: string, invoice: Invoice, _lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const documentId = `peppol-${randomUUID()}`;
    Logger.info(`[EuPeppol:mock] submitted invoice ${invoice.invoiceNumber} → ${documentId}`);
    // Real impl: build UBL 2.1 + EN 16931 invoice XML, wrap in AS4 envelope,
    // POST to the configured access point. Mock returns success.
    return {
      externalId: documentId,
      status: 'submitted',
      raw: { protocol: 'peppol-bis-3.0', accessPoint: 'mock' },
    };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    Logger.info(`[EuPeppol] cancel ${invoice.invoiceNumber} (${invoice.peppolDocumentId ?? '-'}) reason=${reason ?? '-'}`);
  }
}

export default EuPeppolAdapter;

/** ISO 3166-1 alpha-2 EU country → standard VAT rate (simplified). */
const EU_VAT_RATES: Record<string, number> = {
  AT: 0.20, BE: 0.21, BG: 0.20, HR: 0.25, CY: 0.19, CZ: 0.21, DK: 0.25, EE: 0.22,
  FI: 0.255, FR: 0.20, DE: 0.19, GR: 0.24, HU: 0.27, IE: 0.23, IT: 0.22, LV: 0.21,
  LT: 0.21, LU: 0.17, MT: 0.18, NL: 0.21, PL: 0.23, PT: 0.23, RO: 0.19, SK: 0.23,
  SI: 0.22, ES: 0.21, SE: 0.25,
};

/** Pick the VAT rate that applies to a cross-border B2C digital service. */
export function getOssVatRate(consumerCountryCode: string): number {
  return EU_VAT_RATES[consumerCountryCode.toUpperCase()] ?? 0;
}

/** Basic VAT number format check (no VIES roundtrip). */
export function validateEuVatNumber(country: string, vatNumber: string): boolean {
  const patterns: Record<string, RegExp> = {
    AT: /^ATU\d{8}$/, BE: /^BE\d{10}$/, BG: /^BG\d{9,10}$/, CY: /^CY\d{8}[A-Z]$/,
    CZ: /^CZ\d{8,10}$/, DE: /^DE\d{9}$/, DK: /^DK\d{8}$/, EE: /^EE\d{9}$/,
    EL: /^EL\d{9}$/, ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, FI: /^FI\d{8}$/, FR: /^FR[A-Z0-9]{2}\d{9}$/,
    HR: /^HR\d{11}$/, HU: /^HU\d{8}$/, IE: /^IE\d{7}[A-Z]{1,2}$/, IT: /^IT\d{11}$/,
    LT: /^LT(\d{9}|\d{12})$/, LU: /^LU\d{8}$/, LV: /^LV\d{11}$/, MT: /^MT\d{8}$/,
    NL: /^NL\d{9}B\d{2}$/, PL: /^PL\d{10}$/, PT: /^PT\d{9}$/, RO: /^RO\d{2,10}$/,
    SE: /^SE\d{12}$/, SI: /^SI\d{8}$/, SK: /^SK\d{10}$/,
  };
  const re = patterns[country.toUpperCase()];
  return re ? re.test(vatNumber.toUpperCase()) : false;
}
