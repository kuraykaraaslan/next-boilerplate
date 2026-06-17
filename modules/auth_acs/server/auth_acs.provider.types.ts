import type { AcsProviderService } from './auth_acs.types';

/**
 * Contribution shape for the `auth_acs:provider` extension point — the built-in
 * (first-party) path. Providers now ship as SANDBOXED community plugins (discovered
 * per-tenant and wrapped in IsolatedAcsProvider, which wins when installed); this
 * built-in contribution type remains for any future first-party provider. Provider
 * descriptors (label, country, SAML/OIDC defaults) + per-tenant config stay in the
 * host's auth_acs.config / config.service.
 */
export interface AcsProviderContribution {
  /** Stable provider key (e.g. 'tr_edevlet'); must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the national-identity provider implementation. */
  create(): AcsProviderService;
}
