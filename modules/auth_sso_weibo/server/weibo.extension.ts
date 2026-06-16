import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { WeiboProvider } from './providers/weibo.provider';

const contribution: SSOProviderContribution = {
  key: 'weibo',
  create: () => new WeiboProvider(),
};

export default contribution;
