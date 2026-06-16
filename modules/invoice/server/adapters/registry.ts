import { extensionRegistry } from '@nb/common/server/extension-registry';
import SettingService from '@nb/setting/server/setting.service';
import type { InvoiceAdapter } from './base.adapter';
import type { InvoiceAdapterContribution, InvoiceAdapterMetadata } from './invoice.adapter.types';

const INVOICE_ADAPTER_POINT = 'invoice:adapter';
const instances = new Map<string, InvoiceAdapter>();

/** Read & normalise the routing metadata off a contribution; null if malformed. */
function adapterMeta(metadata: unknown): InvoiceAdapterMetadata | null {
  const m = metadata as Partial<InvoiceAdapterMetadata> | undefined;
  if (!m || (m.kind !== 'region' && m.kind !== 'country') || typeof m.code !== 'string') return null;
  return { kind: m.kind, code: m.code.toUpperCase(), label: m.label };
}

/**
 * Resolve an adapter by routing kind + code via the invoice:adapter extension
 * registry. Every adapter lives in its own satellite module (invoice_<key>);
 * instances are cached per kind:code (config is read per-call via SettingService,
 * so caching the instance is safe).
 */
async function loadAdapter(kind: InvoiceAdapterMetadata['kind'], code: string): Promise<InvoiceAdapter | null> {
  const wanted = code.toUpperCase();
  const cacheKey = `${kind}:${wanted}`;
  const cached = instances.get(cacheKey);
  if (cached) return cached;

  const contrib = extensionRegistry.getContributions(INVOICE_ADAPTER_POINT).find((c) => {
    const m = adapterMeta(c.metadata);
    return m?.kind === kind && m.code === wanted;
  });
  if (!contrib) return null;

  const impl = await extensionRegistry.load<InvoiceAdapterContribution>(contrib);
  const inst = impl.create();
  instances.set(cacheKey, inst);
  return inst;
}

/** Resolve the region adapter for a tenant's billing region; null if unknown. */
export async function getInvoiceAdapter(region: string): Promise<InvoiceAdapter | null> {
  return loadAdapter('region', region);
}

/** Resolve a country-specific adapter by issuer country code; null if none. */
export async function getCountryInvoiceAdapter(countryCode: string): Promise<InvoiceAdapter | null> {
  if (!countryCode) return null;
  return loadAdapter('country', countryCode);
}

/**
 * Pick the adapter for an invoice: the issuer-country regime wins when one
 * exists (e.g. an IT issuer always uses FatturaPA), otherwise fall back to the
 * tenant's region adapter. The issuer country comes from `companyCountryCode`.
 */
export async function resolveInvoiceAdapter(tenantId: string, region: string): Promise<InvoiceAdapter | null> {
  const issuerCountry = (await SettingService.getValue(tenantId, 'companyCountryCode')) ?? '';
  return (await getCountryInvoiceAdapter(issuerCountry)) ?? (await getInvoiceAdapter(region));
}

export async function listInvoiceAdapters(tenantId: string): Promise<Array<{ region: string; configured: boolean }>> {
  const out: Array<{ region: string; configured: boolean }> = [];
  for (const contrib of extensionRegistry.getContributions(INVOICE_ADAPTER_POINT)) {
    const m = adapterMeta(contrib.metadata);
    if (!m) continue;
    const impl = await extensionRegistry.load<InvoiceAdapterContribution>(contrib);
    out.push({ region: m.code, configured: await impl.create().isConfigured(tenantId) });
  }
  return out;
}
