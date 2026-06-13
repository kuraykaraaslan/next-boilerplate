import { BaseOidcAcsProvider } from './base.oidc.provider';

/** US — ID.me (OIDC). The pairwise `sub` is the identifier. */
export class UsIdMeProvider extends BaseOidcAcsProvider {
  constructor() { super('us_id_me'); }
}
