import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { WeChatProvider } from './providers/wechat.provider';

const contribution: SSOProviderContribution = {
  key: 'wechat',
  create: () => new WeChatProvider(),
};

export default contribution;
