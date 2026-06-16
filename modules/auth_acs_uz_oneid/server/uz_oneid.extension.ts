import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { UzOneidProvider } from './providers/uz_oneid.provider';

/**
 * OneID (UZ) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports UzOneidProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'uz_oneid',
  create: () => new UzOneidProvider(),
};

export default contribution;
