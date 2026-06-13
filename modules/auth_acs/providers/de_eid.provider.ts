import { BaseSamlAcsProvider } from './base.saml.provider';

/** Germany — Online-Ausweis (eID), typically via an eID-Server speaking SAML with encrypted assertions. */
export class DeEidProvider extends BaseSamlAcsProvider {
  constructor() { super('de_eid'); }
}
