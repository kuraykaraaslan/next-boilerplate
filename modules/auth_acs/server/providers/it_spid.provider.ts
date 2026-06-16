import { BaseSamlAcsProvider } from './base.saml.provider';
import type { SamlValidatedAssertion } from '@nb/auth_saml/server/saml.engine';
import type { AcsProfile } from '../auth_acs.types';

/**
 * Italy — SPID. SAML 2.0. The `fiscalNumber` attribute is commonly prefixed
 * `TINIT-`; we strip it so the stored national id is the bare codice fiscale.
 */
export class ItSpidProvider extends BaseSamlAcsProvider {
  constructor() { super('it_spid'); }

  protected override mapAssertion(assertion: SamlValidatedAssertion): AcsProfile {
    const base = super.mapAssertion(assertion);
    return { ...base, nationalId: base.nationalId.replace(/^TINIT-/i, '') };
  }
}
