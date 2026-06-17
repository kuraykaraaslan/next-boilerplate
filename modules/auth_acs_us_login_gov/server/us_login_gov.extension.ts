import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { UsLoginGovProvider } from './providers/us_login_gov.provider';

/**
 * Login.gov (US) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports UsLoginGovProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'us_login_gov',
  create: () => new UsLoginGovProvider(),
};

export default contribution;
