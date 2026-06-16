import { BaseOidcAcsProvider } from '@nb/auth_acs/server/providers/base.oidc.provider';

/** US — ID.me (OIDC). The pairwise `sub` is the identifier. */
export class UsIdMeProvider extends BaseOidcAcsProvider {
  constructor() { super('us_id_me'); }
}
