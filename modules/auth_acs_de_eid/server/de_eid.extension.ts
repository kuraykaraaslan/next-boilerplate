import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { DeEidProvider } from './providers/de_eid.provider';

/**
 * Online-Ausweis (eID) (DE) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports DeEidProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'de_eid',
  create: () => new DeEidProvider(),
};

export default contribution;
