import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
import type { SSOProviderContribution } from '../auth_sso.provider.types';
import SsoConfigService from '../auth_sso.config.service';
import { IsolatedSsoProvider } from './isolated.sso.provider';

const SSO_PROVIDER_POINT = 'auth_sso:provider';
const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};

/**
 * Resolve the SSO provider implementation for a key. A SANDBOXED community provider
 * installed for the tenant WINS over the built-in; config + callback URL are resolved
 * host-side and handed to IsolatedSsoProvider. Built-in providers (satellite modules
 * discovered via the extension registry) remain the fallback and are cached per key.
 */
export async function getProvider(provider: SSOProvider, tenantId?: string): Promise<SSOProviderService> {
  if (tenantId) {
    const ext = (await listExternalContributions(tenantId, SSO_PROVIDER_POINT)).find((c) => c.key === provider);
    if (ext) {
      const config = await SsoConfigService.resolveConfig(provider, tenantId);
      const callbackUrl = await SsoConfigService.resolveCallbackUrl(provider, tenantId);
      const meta = ext.metadata ?? {};
      return new IsolatedSsoProvider(provider, { ...config, callbackUrl, usesPkce: !!meta.usesPkce, meta }, ext.invoke);
    }
  }

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
