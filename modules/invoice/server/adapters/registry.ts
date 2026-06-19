import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import type { InvoiceAdapter } from './base.adapter';
import type { InvoiceAdapterMetadata } from './invoice.adapter.types';
import { IsolatedInvoiceAdapter } from './isolated.invoice.adapter';

const INVOICE_ADAPTER_POINT = 'invoice:adapter';

/** Read & normalise the routing metadata off a contribution; null if malformed. */
function adapterMeta(metadata: unknown): InvoiceAdapterMetadata | null {
  const m = metadata as Partial<InvoiceAdapterMetadata> | undefined;
  if (!m || (m.kind !== 'region' && m.kind !== 'country') || typeof m.code !== 'string') return null;
  return { kind: m.kind, code: m.code.toUpperCase(), label: m.label };
}

/**
 * Resolve an adapter by routing kind + code. Regional e-invoicing adapters are now
 * SANDBOXED community plugins (the @invoice/* family) contributing into
 * `invoice:adapter`; resolution is per-tenant + per-call (the isolate `invoke` is
 * tenant-bound, so nothing is cached). A tenant without the matching plugin
 * installed has no adapter for that region — there is no built-in fallback (full
 * migration to the marketplace).
 */
async function loadAdapter(
  tenantId: string,
  kind: InvoiceAdapterMetadata['kind'],
  code: string,
): Promise<InvoiceAdapter | null> {
  if (!code) return null;
  const wanted = code.toUpperCase();
  const ext = (await listExternalContributions(tenantId, INVOICE_ADAPTER_POINT)).find((c) => {
    const m = adapterMeta(c.metadata);
    return m?.kind === kind && m.code === wanted;
  });
  if (!ext) return null;
  return new IsolatedInvoiceAdapter(ext.key, ext.metadata ?? {}, ext.invoke);
}

/** Resolve the region adapter for a tenant's billing region; null if unknown. */
export async function getInvoiceAdapter(tenantId: string, region: string): Promise<InvoiceAdapter | null> {
  return loadAdapter(tenantId, 'region', region);
}

/** Resolve a country-specific adapter by issuer country code; null if none. */
export async function getCountryInvoiceAdapter(tenantId: string, countryCode: string): Promise<InvoiceAdapter | null> {
  if (!countryCode) return null;
  return loadAdapter(tenantId, 'country', countryCode);
}

/**
 * Pick the adapter for an invoice: the issuer-country regime wins when one
 * exists (e.g. an IT issuer always uses FatturaPA), otherwise fall back to the
 * tenant's region adapter. The issuer country comes from `companyCountryCode`.
 */
export async function resolveInvoiceAdapter(tenantId: string, region: string): Promise<InvoiceAdapter | null> {
  const issuerCountry = (await SettingService.getValue(tenantId, 'companyCountryCode')) ?? '';
  return (await getCountryInvoiceAdapter(tenantId, issuerCountry)) ?? (await getInvoiceAdapter(tenantId, region));
}

export async function listInvoiceAdapters(tenantId: string): Promise<Array<{ region: string; configured: boolean }>> {
  const out: Array<{ region: string; configured: boolean }> = [];
  for (const ext of await listExternalContributions(tenantId, INVOICE_ADAPTER_POINT)) {
    const m = adapterMeta(ext.metadata);
    if (!m) continue;
    const adapter = new IsolatedInvoiceAdapter(ext.key, ext.metadata ?? {}, ext.invoke);
    out.push({ region: m.code, configured: await adapter.isConfigured(tenantId) });
  }
  return out;
}
