import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { CtEdevletProvider } from './providers/ct_edevlet.provider';

/**
 * e-Devlet (KKTC) ile Giriş (CT) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports CtEdevletProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'ct_edevlet',
  create: () => new CtEdevletProvider(),
};

export default contribution;
