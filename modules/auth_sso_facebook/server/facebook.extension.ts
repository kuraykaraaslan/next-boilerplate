import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { FacebookProvider } from './providers/facebook.provider';

const contribution: SSOProviderContribution = {
  key: 'facebook',
  create: () => new FacebookProvider(),
};

export default contribution;
