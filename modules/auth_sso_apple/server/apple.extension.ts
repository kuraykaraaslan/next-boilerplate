import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { AppleProvider } from './providers/apple.provider';

const contribution: SSOProviderContribution = {
  key: 'apple',
  create: () => new AppleProvider(),
};

export default contribution;
