import { extensionRegistry } from '@kuraykaraaslan/common/server/extension-registry';
import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProviderService } from '../auth_acs.types';
import type { AcsProviderContribution } from '../auth_acs.provider.types';
import { IsolatedAcsProvider } from './isolated.acs.provider';

const ACS_PROVIDER_POINT = 'auth_acs:provider';
const providerInstances: Partial<Record<AcsProvider, AcsProviderService>> = {};

/**
 * Resolve the national-identity provider implementation for a key.
 *
 * Precedence (per product decision): a SANDBOXED community provider installed for
 * the tenant WINS over the built-in one — so once `@idme/idme` is installed, ID.me
 * runs sandboxed. Community providers are OIDC-only (SAML needs XML-DSig, which the
 * sandbox can't do). Built-in providers (discovered via the extension registry)
 * remain the fallback and are cached per key.
 */
export async function getAcsProvider(provider: AcsProvider, tenantId?: string): Promise<AcsProviderService> {
  if (tenantId) {
    const ext = (await listExternalContributions(tenantId, ACS_PROVIDER_POINT)).find((c) => c.key === provider);
    if (ext) {
      const protocol = ext.metadata?.protocol === 'saml' ? 'saml' : 'oidc';
      return new IsolatedAcsProvider(provider, ext.invoke, protocol); // not cached — tenant-scoped
    }
  }

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
