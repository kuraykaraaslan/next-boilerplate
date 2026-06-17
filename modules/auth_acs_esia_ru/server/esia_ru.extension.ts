import type { AcsProviderContribution } from '@kuraykaraaslan/auth_acs/server/auth_acs.provider.types';
import { EsiaProvider } from './providers/esia_ru.provider';

/**
 * Госуслуги (RU) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports EsiaProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'esia_ru',
  create: () => new EsiaProvider(),
};

export default contribution;
