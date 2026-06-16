import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { LinkedInProvider } from './providers/linkedin.provider';

const contribution: SSOProviderContribution = {
  key: 'linkedin',
  create: () => new LinkedInProvider(),
};

export default contribution;
