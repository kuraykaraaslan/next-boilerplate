import { BaseOidcAcsProvider } from '@kuraykaraaslan/auth_acs/server/providers/base.oidc.provider';

/** Azerbaijan — MyGov ID / ASAN Login (OIDC/OAuth). Endpoints supplied via ACS_PROVIDER_MAP. */
export class AzMygovidProvider extends BaseOidcAcsProvider {
  constructor() { super('az_mygovid'); }
}
