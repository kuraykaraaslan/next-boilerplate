import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { TwitterProvider } from './providers/twitter.provider';

const contribution: SSOProviderContribution = {
  key: 'twitter',
  create: () => new TwitterProvider(),
};

export default contribution;
