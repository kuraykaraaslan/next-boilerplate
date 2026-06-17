import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { SlackProvider } from './providers/slack.provider';

const contribution: SSOProviderContribution = {
  key: 'slack',
  create: () => new SlackProvider(),
};

export default contribution;
