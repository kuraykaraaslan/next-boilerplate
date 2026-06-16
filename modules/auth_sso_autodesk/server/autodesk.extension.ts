import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { AutodeskProvider } from './providers/autodesk.provider';

const contribution: SSOProviderContribution = {
  key: 'autodesk',
  create: () => new AutodeskProvider(),
};

export default contribution;
