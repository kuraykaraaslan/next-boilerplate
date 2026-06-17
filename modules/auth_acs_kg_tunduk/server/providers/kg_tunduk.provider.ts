import { BaseOidcAcsProvider } from '@kuraykaraaslan/auth_acs/server/providers/base.oidc.provider';

/**
 * Kyrgyzstan — Tunduk (X-Road based). Protocol/endpoints not yet confirmed; ships
 * disabled and refuses login until configured via ACS_PROVIDER_MAP.
 */
export class KgTundukProvider extends BaseOidcAcsProvider {
  constructor() { super('kg_tunduk'); }
}
