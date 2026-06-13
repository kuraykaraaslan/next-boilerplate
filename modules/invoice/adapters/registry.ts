import type { InvoiceAdapter } from './base.adapter';
import TrEarsivAdapter from './tr_earsiv.adapter';
import EuPeppolAdapter from './eu_peppol.adapter';
import UsStandardAdapter from './us_standard.adapter';
import ItFatturaPaAdapter from './it_fatturapa.adapter';
import FrChorusProAdapter from './fr_choruspro.adapter';
import DeZugferdAdapter from './de_zugferd.adapter';
import MxCfdiAdapter from './mx_cfdi.adapter';
import InGstAdapter from './in_gst.adapter';
import SettingService from '@/modules/setting/setting.service';

/**
 * Region-level adapters (selected by the tenant's `billingRegion` setting). For
 * the EU and "OTHER" regions, a country-specific adapter may take precedence —
 * see `COUNTRY_ADAPTERS` and `resolveInvoiceAdapter`.
 */
const adapters = new Map<string, InvoiceAdapter>([
  ['TR', new TrEarsivAdapter()],
  ['EU', new EuPeppolAdapter()],
  ['US', new UsStandardAdapter()],
]);

/**
 * Country-specific e-invoicing regimes, keyed by the **issuer's** country
 * (ISO 3166-1 alpha-2). The issuing legal entity's country determines the
 * mandate (FatturaPA for IT issuers, Chorus Pro/Factur-X for FR, ZUGFeRD for
 * DE, CFDI for MX, GST IRP for IN). These override the coarse region adapter.
 */
const COUNTRY_ADAPTERS = new Map<string, InvoiceAdapter>([
  ['IT', new ItFatturaPaAdapter()],
  ['FR', new FrChorusProAdapter()],
  ['DE', new DeZugferdAdapter()],
  ['MX', new MxCfdiAdapter()],
  ['IN', new InGstAdapter()],
]);

/** Resolve the region adapter for a tenant's billing region; null if unknown. */
export function getInvoiceAdapter(region: string): InvoiceAdapter | null {
  return adapters.get(region) ?? null;
}

/** Resolve a country-specific adapter by issuer country code; null if none. */
export function getCountryInvoiceAdapter(countryCode: string): InvoiceAdapter | null {
  return COUNTRY_ADAPTERS.get(countryCode.toUpperCase()) ?? null;
}

/**
 * Pick the adapter for an invoice: the issuer-country regime wins when one
 * exists (e.g. an IT issuer always uses FatturaPA), otherwise fall back to the
 * tenant's region adapter. The issuer country comes from `companyCountryCode`,
 * falling back to the invoice's own `region`.
 */
export async function resolveInvoiceAdapter(tenantId: string, region: string): Promise<InvoiceAdapter | null> {
  const issuerCountry = (await SettingService.getValue(tenantId, 'companyCountryCode')) ?? '';
  return getCountryInvoiceAdapter(issuerCountry) ?? getInvoiceAdapter(region);
}

export async function listInvoiceAdapters(tenantId: string): Promise<Array<{ region: string; configured: boolean }>> {
  const out: Array<{ region: string; configured: boolean }> = [];
  for (const [region, adapter] of adapters) {
    out.push({ region, configured: await adapter.isConfigured(tenantId) });
  }
  for (const [country, adapter] of COUNTRY_ADAPTERS) {
    out.push({ region: country, configured: await adapter.isConfigured(tenantId) });
  }
  return out;
}
