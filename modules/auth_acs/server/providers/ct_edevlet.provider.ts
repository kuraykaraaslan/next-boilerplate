import { BaseSamlAcsProvider } from './base.saml.provider';

/** KKTC (Northern Cyprus) — edevlet.gov.ct.tr (TÜRKSAT). Same SAML platform as TR. */
export class CtEdevletProvider extends BaseSamlAcsProvider {
  constructor() { super('ct_edevlet'); }
}
