import type { AcsProviderService } from './auth_acs.types';

/**
 * Contribution shape for the `auth_acs:provider` extension point. A satellite
 * module (e.g. auth_acs_tr_edevlet) default-exports one of these; the host
 * discovers it via the extension registry and never imports the provider class
 * directly. Provider descriptors (label, country, SAML/OIDC defaults) and
 * per-tenant config stay in the host's auth_acs.config / config.service — the
 * contribution only constructs the provider implementation.
 */
export interface AcsProviderContribution {
  /** Stable provider key (e.g. 'tr_edevlet'); must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the national-identity provider implementation. */
  create(): AcsProviderService;
}
