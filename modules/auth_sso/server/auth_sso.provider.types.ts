import type { SSOProviderService } from './auth_sso.types';

/**
 * Contribution shape for the `auth_sso:provider` extension point. A satellite
 * module (e.g. auth_sso_google) default-exports one of these; the host
 * discovers it via the extension registry and never imports the provider class
 * directly. Provider config (endpoints, scopes, per-tenant BYO clientId/secret)
 * stays in the host's auth_sso.config — the contribution only constructs the
 * provider implementation.
 */
export interface SSOProviderContribution {
  /** Stable provider key (e.g. 'google'); must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the provider implementation. */
  create(): SSOProviderService;
}
