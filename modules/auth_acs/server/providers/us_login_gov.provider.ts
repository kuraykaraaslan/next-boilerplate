import { BaseOidcAcsProvider } from './base.oidc.provider';

/**
 * US — Login.gov (OIDC). Authenticates the client with `private_key_jwt`
 * (set `privateKeyJwt` in ACS_PROVIDER_MAP). The pairwise `sub` is the identifier.
 */
export class UsLoginGovProvider extends BaseOidcAcsProvider {
  constructor() { super('us_login_gov'); }
}
