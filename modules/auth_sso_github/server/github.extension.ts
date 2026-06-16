import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { GithubProvider } from './providers/github.provider';

const contribution: SSOProviderContribution = {
  key: 'github',
  create: () => new GithubProvider(),
};

export default contribution;
