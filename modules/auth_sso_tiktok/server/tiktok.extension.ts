import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { TikTokProvider } from './providers/tiktok.provider';

const contribution: SSOProviderContribution = {
  key: 'tiktok',
  create: () => new TikTokProvider(),
};

export default contribution;
