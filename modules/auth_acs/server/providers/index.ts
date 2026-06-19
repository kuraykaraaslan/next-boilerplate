import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProviderService } from '../auth_acs.types';
import { IsolatedAcsProvider } from './isolated.acs.provider';

const ACS_PROVIDER_POINT = 'auth_acs:provider';

/**
 * Resolve the national-identity provider for a key. Providers are SANDBOXED community
 * plugins (the @acs/* family) resolved per-tenant via the external-contributions
 * bridge — there is no in-tree built-in fallback. OIDC and SAML both run sandboxed:
 * trust-critical verification is host-side (crypto.verifyJwks / saml.validateResponse).
 */
export async function getAcsProvider(provider: AcsProvider, tenantId?: string): Promise<AcsProviderService> {
  if (!tenantId) throw new Error(`ACS provider resolution requires a tenant: ${provider}`);
  const ext = (await listExternalContributions(tenantId, ACS_PROVIDER_POINT)).find((c) => c.key === provider);
  if (!ext) throw new Error(`Unknown or not-installed ACS provider: ${provider}`);
  const protocol = ext.metadata?.protocol === 'saml' ? 'saml' : 'oidc';
  return new IsolatedAcsProvider(provider, ext.invoke, protocol);
}
