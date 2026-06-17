import { NextRequest } from 'next/server';
import { scimResponse } from '@kuraykaraaslan/scim/server/scim.errors';
import { SCIM_SCHEMAS } from '@kuraykaraaslan/scim/server/scim.types';

/**
 * GET /tenant/{tenantId}/api/scim/v2/Schemas
 * Returns the attribute definitions for User + Group resources
 * (RFC 7643 §7). IdPs use this to render their attribute-mapping UIs.
 *
 * We expose the minimum surface we actually map; uniqueness/required
 * markers match the actual constraints in the User + TenantMember tables.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const base = `/tenant/${tenantId}/api/scim/v2`;

  const userSchema = {
    schemas: [SCIM_SCHEMAS.SCHEMA],
    id: SCIM_SCHEMAS.USER,
    name: 'User',
    description: 'SCIM 2.0 core User schema (subset).',
    attributes: [
      { name: 'userName', type: 'string', required: true, uniqueness: 'server', mutability: 'readWrite' },
      { name: 'externalId', type: 'string', required: false, uniqueness: 'server', mutability: 'readWrite' },
      { name: 'active', type: 'boolean', required: false, mutability: 'readWrite' },
      {
        name: 'name', type: 'complex', subAttributes: [
          { name: 'givenName', type: 'string' },
          { name: 'familyName', type: 'string' },
          { name: 'formatted', type: 'string' },
        ],
      },
      {
        name: 'emails', type: 'complex', multiValued: true, subAttributes: [
          { name: 'value', type: 'string' },
          { name: 'primary', type: 'boolean' },
          { name: 'type', type: 'string' },
        ],
      },
    ],
    meta: { resourceType: 'Schema', location: `${base}/Schemas/${SCIM_SCHEMAS.USER}` },
  };

  const groupSchema = {
    schemas: [SCIM_SCHEMAS.SCHEMA],
    id: SCIM_SCHEMAS.GROUP,
    name: 'Group',
    description: 'SCIM 2.0 core Group schema (stub).',
    attributes: [
      { name: 'displayName', type: 'string', required: true },
      { name: 'members', type: 'complex', multiValued: true, mutability: 'readOnly' },
    ],
    meta: { resourceType: 'Schema', location: `${base}/Schemas/${SCIM_SCHEMAS.GROUP}` },
  };

  return scimResponse({
    schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
    totalResults: 2,
    startIndex: 1,
    itemsPerPage: 2,
    Resources: [userSchema, groupSchema],
  });
}
