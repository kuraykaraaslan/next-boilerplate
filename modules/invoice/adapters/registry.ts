import type { InvoiceAdapter } from './base.adapter';
import TrEarsivAdapter from './tr_earsiv.adapter';
import EuPeppolAdapter from './eu_peppol.adapter';
import UsStandardAdapter from './us_standard.adapter';

const adapters = new Map<string, InvoiceAdapter>([
  ['TR', new TrEarsivAdapter()],
  ['EU', new EuPeppolAdapter()],
  ['US', new UsStandardAdapter()],
]);

/** Resolve the adapter for a tenant's billing region; null for unknown regions. */
export function getInvoiceAdapter(region: string): InvoiceAdapter | null {
  return adapters.get(region) ?? null;
}

export async function listInvoiceAdapters(tenantId: string): Promise<Array<{ region: string; configured: boolean }>> {
  const out: Array<{ region: string; configured: boolean }> = [];
  for (const [region, adapter] of adapters) {
    out.push({ region, configured: await adapter.isConfigured(tenantId) });
  }
  return out;
}
