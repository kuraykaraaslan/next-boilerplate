import { BaseSamlAcsProvider } from '@nb/auth_acs/server/providers/base.saml.provider';

/** Spain — Cl@ve. eIDAS-based SAML 2.0; PersonIdentifier carries the DNI/NIE. */
export class EsClaveProvider extends BaseSamlAcsProvider {
  constructor() { super('es_clave'); }
}
