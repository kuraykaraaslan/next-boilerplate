import { BaseSamlAcsProvider } from '@kuraykaraaslan/auth_acs/server/providers/base.saml.provider';

/** Türkiye — e-Devlet Kapısı (TÜRKSAT). SAML 2.0; returns TCKN + ad + soyad, no email. */
export class TrEdevletProvider extends BaseSamlAcsProvider {
  constructor() { super('tr_edevlet'); }
}
