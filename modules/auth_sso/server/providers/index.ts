import { extensionRegistry } from '@nb/common/server/extension-registry';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
import type { SSOProviderContribution } from '../auth_sso.provider.types';

const SSO_PROVIDER_POINT = 'auth_sso:provider';
const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};

/**
 * Resolve the SSO provider implementation for a key. Every provider lives in
 * its own satellite module (auth_sso_<key>) and is discovered via the
 * auth_sso:provider extension registry; instances are cached per key.
 */
export async function getProvider(provider: SSOProvider): Promise<SSOProviderService> {
  const cached = providerInstances[provider];
  if (cached) return cached;

  const contrib = extensionRegistry
    .getContributions(SSO_PROVIDER_POINT)
    .find((c) => c.key === provider);
  if (!contrib) throw new Error(`Unknown SSO provider: ${provider}`);

  const impl = await extensionRegistry.load<SSOProviderContribution>(contrib);
  const instance = impl.create();
  providerInstances[provider] = instance;
  return instance;
}
