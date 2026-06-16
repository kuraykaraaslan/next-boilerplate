import type BaseAIProvider from './providers/base.provider';
import type { ProviderConfig } from './ai.types';

export type { ProviderConfig };

/** A per-tenant settings record as returned by SettingService.getByKeys. */
export type ProviderSettings = Record<string, string | undefined>;

/**
 * The contract a satellite AI-provider module exports (as its `default`) from
 * its `*.extension.ts`. The host's `AIProviderService` discovers these through
 * the extension registry (point `ai:provider`) and never imports them directly,
 * so a provider can be added/removed by enabling/disabling its module — no host
 * code change.
 *
 * Listing operations (which providers exist, which models) are driven by the
 * manifest `metadata` (code-free); only instantiation loads this contract.
 */
export interface AIProviderContribution {
  /** Stable provider key, e.g. 'openai'. Must equal the manifest contribution key. */
  readonly key: string;
  /** Setting keys this provider reads to build its per-tenant config. */
  readonly settingKeys: readonly string[];
  /** Build the provider config from per-tenant settings (with env fallbacks applied internally). */
  resolveConfig(settings: ProviderSettings): ProviderConfig;
  /** Instantiate the provider for a resolved config. */
  create(config: ProviderConfig): BaseAIProvider;
}
