import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { AlipayProvider } from './providers/alipay.provider';

const contribution: SSOProviderContribution = {
  key: 'alipay',
  create: () => new AlipayProvider(),
};

export default contribution;
