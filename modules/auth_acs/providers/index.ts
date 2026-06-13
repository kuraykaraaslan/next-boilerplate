import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProviderService } from '../auth_acs.types';
import { TrEdevletProvider } from './tr_edevlet.provider';
import { CtEdevletProvider } from './ct_edevlet.provider';
import { EuEidasProvider } from './eu_eidas.provider';
import { ItSpidProvider } from './it_spid.provider';
import { EsClaveProvider } from './es_clave.provider';
import { DeEidProvider } from './de_eid.provider';
import { AzMygovidProvider } from './az_mygovid.provider';
import { UzOneidProvider } from './uz_oneid.provider';
import { KzEgovProvider } from './kz_egov.provider';
import { KgTundukProvider } from './kg_tunduk.provider';
import { UsLoginGovProvider } from './us_login_gov.provider';
import { UsIdMeProvider } from './us_id_me.provider';

/**
 * Type-safe national-identity provider registry. Adding a provider to
 * AcsProviderEnum without registering its factory here is a compile error.
 * Instances are NOT memoised (config is read per-construction so a config change
 * — e.g. in tests after mutating ACS_PROVIDER_MAP — takes effect immediately).
 */
const PROVIDER_FACTORIES: Record<AcsProvider, () => AcsProviderService> = {
  tr_edevlet: () => new TrEdevletProvider(),
  ct_edevlet: () => new CtEdevletProvider(),
  eu_eidas: () => new EuEidasProvider(),
  it_spid: () => new ItSpidProvider(),
  es_clave: () => new EsClaveProvider(),
  de_eid: () => new DeEidProvider(),
  az_mygovid: () => new AzMygovidProvider(),
  uz_oneid: () => new UzOneidProvider(),
  kz_egov: () => new KzEgovProvider(),
  kg_tunduk: () => new KgTundukProvider(),
  us_login_gov: () => new UsLoginGovProvider(),
  us_id_me: () => new UsIdMeProvider(),
};

export function getAcsProvider(provider: AcsProvider): AcsProviderService {
  return PROVIDER_FACTORIES[provider]();
}
