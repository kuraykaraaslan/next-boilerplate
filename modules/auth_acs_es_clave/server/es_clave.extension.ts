import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { EsClaveProvider } from './providers/es_clave.provider';

/**
 * Cl@ve (ES) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports EsClaveProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'es_clave',
  create: () => new EsClaveProvider(),
};

export default contribution;
