import type { AcsProviderContribution } from '@nb/auth_acs/server/auth_acs.provider.types';
import { KgTundukProvider } from './providers/kg_tunduk.provider';

/**
 * Tunduk (KG) contribution for the `auth_acs:provider` extension
 * point. The host (auth_acs providers/index) discovers this via the extension
 * registry and never imports KgTundukProvider directly.
 */
const contribution: AcsProviderContribution = {
  key: 'kg_tunduk',
  create: () => new KgTundukProvider(),
};

export default contribution;
