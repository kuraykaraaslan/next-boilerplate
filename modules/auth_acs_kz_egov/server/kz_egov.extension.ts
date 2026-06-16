import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { KzEgovProvider } from './providers/kz_egov.provider';

/**
 * eGov.kz (KZ) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports KzEgovProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'kz_egov',
  create: () => new KzEgovProvider(),
};

export default contribution;
