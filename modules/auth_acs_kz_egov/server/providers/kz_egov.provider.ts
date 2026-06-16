import { BaseOidcAcsProvider } from '@nb/auth_acs/server/providers/base.oidc.provider';

/**
 * Kazakhstan — eGov.kz. Protocol/endpoints not yet confirmed; ships disabled and
 * refuses login until configured via ACS_PROVIDER_MAP (never fakes success).
 */
export class KzEgovProvider extends BaseOidcAcsProvider {
  constructor() { super('kz_egov'); }
}
