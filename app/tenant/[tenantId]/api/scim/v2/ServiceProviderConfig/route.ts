import { NextRequest } from 'next/server';
import { scimResponse } from '@/modules/scim/scim.errors';
import { SCIM_SCHEMAS } from '@/modules/scim/scim.types';

/**
 * GET /tenant/{tenantId}/api/scim/v2/ServiceProviderConfig
 * Capability discovery — RFC 7643 §5. Public (IdPs typically probe this
 * before exchanging credentials).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const body = {
    schemas: [SCIM_SCHEMAS.SERVICE_PROVIDER_CONFIG],
    documentationUri: 'https://datatracker.ietf.org/doc/html/rfc7644',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: true },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'Tenant-scoped API key with the scim:read / scim:write scope.',
        specUri: 'https://datatracker.ietf.org/doc/html/rfc6750',
        type: 'oauthbearertoken',
        primary: true,
      },
    ],
    meta: {
      resourceType: 'ServiceProviderConfig',
      location: `/tenant/${tenantId}/api/scim/v2/ServiceProviderConfig`,
    },
  };
  return scimResponse(body);
}
