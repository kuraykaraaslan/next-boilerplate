import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { GoogleProvider } from './providers/google.provider';

/**
 * Google contribution for the `auth_sso:provider` extension point. The host
 * (auth_sso providers/index) discovers this via the extension registry and never
 * imports GoogleProvider directly.
 */
const contribution: SSOProviderContribution = {
  key: 'google',
  create: () => new GoogleProvider(),
};

export default contribution;
