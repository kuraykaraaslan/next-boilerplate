import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { MicrosoftProvider } from './providers/microsoft.provider';

const contribution: SSOProviderContribution = {
  key: 'microsoft',
  create: () => new MicrosoftProvider(),
};

export default contribution;
