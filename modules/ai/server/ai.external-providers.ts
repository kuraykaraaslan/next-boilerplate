// Decoupling seam for runtime-discovered AI providers (e.g. sandboxed community
// plugins). The `ai` module stays free of any marketplace/plugin_runtime import:
// a higher layer registers a source at boot, and AIProviderService merges its
// providers alongside the build-time `ai:provider` extension contributions.

import type BaseAIProvider from './providers/base.provider';

export interface ExternalAIProvider {
  key: string;
  label?: string;
  models: string[];
  /** Build a host-facing provider instance (e.g. a sandbox-backed facade). */
  build: () => Promise<BaseAIProvider> | BaseAIProvider;
}

export type ExternalAIProviderSource = (tenantId: string) => Promise<ExternalAIProvider[]>;

let _source: ExternalAIProviderSource | null = null;

export function registerExternalAIProviderSource(source: ExternalAIProviderSource): void {
  _source = source;
}

export async function listExternalAIProviders(tenantId: string): Promise<ExternalAIProvider[]> {
  if (!_source) return [];
  try {
    return await _source(tenantId);
  } catch {
    return []; // a broken source must never take down first-party providers
  }
}
