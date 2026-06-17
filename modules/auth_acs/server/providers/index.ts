import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProviderService } from '../auth_acs.types';
import type { AcsProviderContribution } from '../auth_acs.provider.types';

const ACS_PROVIDER_POINT = 'auth_acs:provider';
const providerInstances: Partial<Record<AcsProvider, AcsProviderService>> = {};

/**
 * Resolve the national-identity provider implementation for a key. Every
 * provider lives in its own satellite module (auth_acs_<key>) and is discovered
 * via the auth_acs:provider extension registry; instances are cached per key.
 * Config is read per-construction inside the provider (so a config change — e.g.
 * in tests after mutating ACS_PROVIDER_MAP — takes effect on the next resolve
 * once the cache is reset).
 */
export async function getAcsProvider(provider: AcsProvider): Promise<AcsProviderService> {
  const cached = providerInstances[provider];
  if (cached) return cached;

  const contrib = extensionRegistry
    .getContributions(ACS_PROVIDER_POINT)
    .find((c) => c.key === provider);
  if (!contrib) throw new Error(`Unknown ACS provider: ${provider}`);

  const impl = await extensionRegistry.load<AcsProviderContribution>(contrib);
  const instance = impl.create();
  providerInstances[provider] = instance;
  return instance;
}
