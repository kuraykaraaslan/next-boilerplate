import type { SSOProviderContribution } from '@kuraykaraaslan/auth_sso/server/auth_sso.provider.types';
import { YandexProvider } from './providers/yandex.provider';

const contribution: SSOProviderContribution = {
  key: 'yandex',
  create: () => new YandexProvider(),
};

export default contribution;
