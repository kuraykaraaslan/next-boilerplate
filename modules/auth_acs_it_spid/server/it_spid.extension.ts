import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { ItSpidProvider } from './providers/it_spid.provider';

/**
 * Entra con SPID (IT) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports ItSpidProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'it_spid',
  create: () => new ItSpidProvider(),
};

export default contribution;
