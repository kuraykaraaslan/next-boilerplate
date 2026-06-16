import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { UsIdMeProvider } from './providers/us_id_me.provider';

/**
 * ID.me (US) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports UsIdMeProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'us_id_me',
  create: () => new UsIdMeProvider(),
};

export default contribution;
