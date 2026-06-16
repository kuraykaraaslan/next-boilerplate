import SettingService from '@nb/setting/server/setting.service';
import Logger from '@nb/logger';
import type { InvoiceAdapter, InvoiceAdapterSubmitResult } from '@nb/invoice/server/adapters/base.adapter';
import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { buildUblInvoiceXml } from './eu_ubl';

/**
 * EU — Peppol BIS Billing 3.0 (UBL 2.1 + EN 16931). We build a real UBL 2.1
 * invoice document and POST it to the tenant's configured Access Point. There
 * is **no mock fallback**: if the tenant has not configured an Access Point we
 * return `noop`; if the Access Point call fails we surface the error so the
 * issue flow records the failure rather than a fake success.
 *
 * The Access Point operator is responsible for the AS4 transport onto the
 * Peppol network. The submission contract (URL + optional bearer token) is
 * tenant-configurable via settings.
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

  async submit(tenantId: string, invoice: Invoice, lines: InvoiceLine[]): Promise<InvoiceAdapterSubmitResult> {
    const [accessPointUrl, token, endpointId, docTypeId, seller] = await Promise.all([
      SettingService.getValue(tenantId, 'peppolAccessPointUrl'),
      SettingService.getValue(tenantId, 'peppolAccessPointToken'),
      SettingService.getValue(tenantId, 'peppolEndpointId'),
      SettingService.getValue(tenantId, 'peppolDocumentTypeId'),
      SettingService.getByKeys(tenantId, [
        'companyLegalName', 'companyTaxId', 'euVatNumber', 'companyAddressLine1',
        'companyCity', 'companyPostalCode', 'companyCountryCode',
      ]),
    ]);

    // No Access Point configured → honestly do nothing (no fake document id).
    if (!accessPointUrl) {
      Logger.info(`[EuPeppol] no Access Point configured for ${invoice.invoiceNumber} → noop`);
      return { status: 'noop' };
    }

    const xml = buildUblInvoiceXml({
      invoice,
      lines,
      seller: {
        legalName: seller.companyLegalName ?? '',
        taxId: seller.companyTaxId ?? '',
        vatNumber: seller.euVatNumber ?? seller.companyTaxId ?? '',
        addressLine: seller.companyAddressLine1 ?? '',
        city: seller.companyCity ?? '',
        postalCode: seller.companyPostalCode ?? '',
        countryCode: (seller.companyCountryCode ?? 'EU').toUpperCase(),
        endpointId: endpointId ?? '',
      },
      documentTypeId: docTypeId ?? undefined,
    });

    const res = await fetch(accessPointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: xml,
    });

    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`Peppol Access Point ${res.status}: ${responseText.slice(0, 500)}`);
    }

    // Best-effort extraction of the Access Point's document reference.
    let externalId: string | undefined;
    try {
      const json = JSON.parse(responseText) as { documentId?: string; id?: string; messageId?: string };
      externalId = json.documentId ?? json.id ?? json.messageId;
    } catch {
      const m = responseText.match(/<(?:DocumentId|MessageId|Id)>([^<]+)</i);
      externalId = m?.[1];
    }

    Logger.info(`[EuPeppol] submitted ${invoice.invoiceNumber} → ${externalId ?? '(no id returned)'}`);
    return {
      externalId,
      status: 'submitted',
      raw: { protocol: 'peppol-bis-3.0', accessPoint: accessPointUrl },
    };
  }

  async cancel(_tenantId: string, invoice: Invoice, reason?: string): Promise<void> {
    // Peppol has no generic recall; cancellation is expressed as a credit note
    // on our side. Nothing to call on the Access Point.
    Logger.info(`[EuPeppol] cancel ${invoice.invoiceNumber} (${invoice.peppolDocumentId ?? '-'}) reason=${reason ?? '-'} — issue a credit note`);
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

/** Basic VAT number format check (no VIES roundtrip) — a fast pre-filter. */
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

export interface ViesValidationResult {
  valid: boolean;
  /** Where the verdict came from: the live VIES service, a local format check, or unavailable. */
  source: 'vies' | 'format' | 'unavailable';
  name?: string;
  address?: string;
}

/**
 * Validate an intra-EU VAT number against the European Commission's live VIES
 * service (real REST roundtrip). Greece uses the `EL` country prefix for VIES.
 *
 * On a network/service error we do NOT silently claim validity: we return
 * `source: 'unavailable'` with the local format-check verdict, so the caller
 * can decide whether to block or warn. The supplied VAT number may include or
 * omit the country prefix.
 */
export async function validateEuVatNumberOnline(
  country: string,
  vatNumber: string,
  timeoutMs = 5000,
): Promise<ViesValidationResult> {
  const countryCode = country.toUpperCase() === 'GR' ? 'EL' : country.toUpperCase();
  const cleaned = vatNumber.toUpperCase().replace(/[\s-]/g, '').replace(new RegExp(`^${countryCode}`), '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber: cleaned }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { valid: validateEuVatNumber(countryCode, `${countryCode}${cleaned}`), source: 'unavailable' };
    }
    const json = (await res.json()) as { valid?: boolean; name?: string; address?: string };
    return {
      valid: Boolean(json.valid),
      source: 'vies',
      name: json.name && json.name !== '---' ? json.name : undefined,
      address: json.address && json.address !== '---' ? json.address : undefined,
    };
  } catch (err) {
    Logger.warn(`[Invoice.vies] VIES check failed for ${countryCode}${cleaned}: ${err instanceof Error ? err.message : err}`);
    return { valid: validateEuVatNumber(countryCode, `${countryCode}${cleaned}`), source: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
