import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { AzMygovidProvider } from './providers/az_mygovid.provider';

/**
 * MyGov ID (AZ) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports AzMygovidProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'az_mygovid',
  create: () => new AzMygovidProvider(),
};

export default contribution;
