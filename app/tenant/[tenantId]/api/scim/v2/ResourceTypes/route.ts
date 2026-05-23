import { NextRequest } from 'next/server';
import { scimResponse } from '@/modules/scim/scim.errors';
import { SCIM_SCHEMAS } from '@/modules/scim/scim.types';

/**
 * GET /tenant/{tenantId}/api/scim/v2/ResourceTypes
 * Enumerates the resource types this SCIM provider exposes (RFC 7643 §6).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const base = `/tenant/${tenantId}/api/scim/v2`;
  const Resources = [
    {
      schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
      id: 'User',
      name: 'User',
      endpoint: '/Users',
      description: 'User resource backed by tenant_member + user.',
      schema: SCIM_SCHEMAS.USER,
      meta: { resourceType: 'ResourceType', location: `${base}/ResourceTypes/User` },
    },
    {
      schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
      id: 'Group',
      name: 'Group',
      endpoint: '/Groups',
      description: 'Group resource (stub — no operations supported).',
      schema: SCIM_SCHEMAS.GROUP,
      meta: { resourceType: 'ResourceType', location: `${base}/ResourceTypes/Group` },
    },
  ];

  return scimResponse({
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults: Resources.length,
    startIndex: 1,
    itemsPerPage: Resources.length,
    Resources,
  });
}
