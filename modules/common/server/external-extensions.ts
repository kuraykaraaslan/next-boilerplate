// Generic, host-agnostic bridge for runtime-discovered (e.g. sandboxed community)
// contributions into ANY host extension point. Host modules (ai, storage, auth…)
// stay free of marketplace/plugin_runtime imports and simply ask for the
// contributions to their point.
//
// Discovery is DYNAMIC, not boot-registered: sources are themselves declared as
// `external:contributions` extension contributions and pulled on demand through
// the generated extension registry (same lazy dynamic-import mechanism storage
// providers use). So discovery never depends on instrumentation having run, never
// goes stale across dev hot-reloads, and needs no server restart.

import { extensionRegistry } from './extension-registry';

export interface ExternalContribution {
  /** Provider/contribution key (e.g. 'kimi'). */
  key: string;
  /** Static manifest metadata for the point (label, models, secrets, …). */
  metadata: Record<string, unknown>;
  /** Whether the contribution's required credentials are set for the tenant. */
  configured: boolean;
  /** Forward an operation into the contribution (e.g. a sandboxed provider op). */
  invoke: (op: string, input: unknown) => Promise<unknown>;
}

/** A source resolves the external contributions for a given host point + tenant. */
export type ExternalContributionSource = (
  tenantId: string,
  point: string,
) => Promise<ExternalContribution[]>;

/** Extension point that source modules contribute into (default export = a source fn). */
const SOURCE_POINT = 'external:contributions';

/**
 * Contributions to a host extension point, gathered live from every registered
 * source. Empty when no source module is present. A broken source is skipped, never
 * fatal — first-party contributions must keep working.
 */
export async function listExternalContributions(tenantId: string, point: string): Promise<ExternalContribution[]> {
  const sources = extensionRegistry.getContributions(SOURCE_POINT);
  if (!sources.length) return [];
  const out: ExternalContribution[] = [];
  for (const ext of sources) {
    try {
      const source = await extensionRegistry.load<ExternalContributionSource>(ext);
      out.push(...(await source(tenantId, point)));
    } catch {
      /* skip a broken/absent source */
    }
  }
  return out;
}
