import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { EuEidasProvider } from './providers/eu_eidas.provider';

/**
 * eIDAS (EU) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports EuEidasProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'eu_eidas',
  create: () => new EuEidasProvider(),
};

export default contribution;
