import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { QQProvider } from './providers/qq.provider';

const contribution: SSOProviderContribution = {
  key: 'qq',
  create: () => new QQProvider(),
};

export default contribution;
