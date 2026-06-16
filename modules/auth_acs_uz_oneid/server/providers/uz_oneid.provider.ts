import { BaseOidcAcsProvider } from '@nb/auth_acs/server/providers/base.oidc.provider';

/** Uzbekistan — OneID (OAuth 2.0, sso.egov.uz). Identity keyed on PINFL. */
export class UzOneidProvider extends BaseOidcAcsProvider {
  constructor() { super('uz_oneid'); }
}
