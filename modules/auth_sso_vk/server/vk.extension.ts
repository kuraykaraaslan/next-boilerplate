import type { SSOProviderContribution } from '@nb/auth_sso/server/auth_sso.provider.types';
import { VkProvider } from './providers/vk.provider';

const contribution: SSOProviderContribution = {
  key: 'vk',
  create: () => new VkProvider(),
};

export default contribution;
