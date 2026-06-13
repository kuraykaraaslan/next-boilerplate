import { BaseSamlAcsProvider } from './base.saml.provider';

/** eIDAS generic node. SAML 2.0 with encrypted assertions; minimal dataset (PersonIdentifier). */
export class EuEidasProvider extends BaseSamlAcsProvider {
  constructor() { super('eu_eidas'); }
}
