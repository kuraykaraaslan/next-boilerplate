import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
import SsoConfigService from '../auth_sso.config.service';
import { IsolatedSsoProvider } from './isolated.sso.provider';

const SSO_PROVIDER_POINT = 'auth_sso:provider';

/**
 * Resolve the SSO (social-login) provider for a key. Providers are SANDBOXED community
 * plugins (the @sso/* family) resolved per-tenant via the external-contributions
 * bridge — there is no in-tree built-in fallback. Config + callback URL are resolved
 * host-side and handed to IsolatedSsoProvider; the client secret never enters the
 * isolate. Without a tenant context no provider can be resolved (callers that lack one
 * — e.g. best-effort token revoke/refresh — treat the throw as "unavailable").
 */
export async function getProvider(provider: SSOProvider, tenantId?: string): Promise<SSOProviderService> {
  if (!tenantId) throw new Error(`SSO provider resolution requires a tenant: ${provider}`);
  const ext = (await listExternalContributions(tenantId, SSO_PROVIDER_POINT)).find((c) => c.key === provider);
  if (!ext) throw new Error(`Unknown or not-installed SSO provider: ${provider}`);
  const config = await SsoConfigService.resolveConfig(provider, tenantId);
  const callbackUrl = await SsoConfigService.resolveCallbackUrl(provider, tenantId);
  const meta = ext.metadata ?? {};
  return new IsolatedSsoProvider(provider, { ...config, callbackUrl, usesPkce: !!meta.usesPkce, meta }, ext.invoke);
}
