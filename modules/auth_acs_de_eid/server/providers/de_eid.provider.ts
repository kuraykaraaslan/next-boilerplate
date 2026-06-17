import { BaseSamlAcsProvider } from '@kuraykaraaslan/auth_acs/server/providers/base.saml.provider';

/** Germany — Online-Ausweis (eID), typically via an eID-Server speaking SAML with encrypted assertions. */
export class DeEidProvider extends BaseSamlAcsProvider {
  constructor() { super('de_eid'); }
}
