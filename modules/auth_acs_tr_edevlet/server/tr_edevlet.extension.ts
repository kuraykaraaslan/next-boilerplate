import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { TrEdevletProvider } from './providers/tr_edevlet.provider';

/**
 * e-Devlet ile Giriş (TR) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports TrEdevletProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'tr_edevlet',
  create: () => new TrEdevletProvider(),
};

export default contribution;
