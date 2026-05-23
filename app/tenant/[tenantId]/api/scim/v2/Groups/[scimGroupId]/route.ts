import { NextRequest } from 'next/server';
import ApiKeyService from '@/modules/api_key/api_key.service';
import { scimError } from '@/modules/scim/scim.errors';
import ScimMessages from '@/modules/scim/scim.messages';

type Ctx = { params: Promise<{ tenantId: string; scimGroupId: string }> };

async function authOr401(request: NextRequest, tenantId: string, scope: 'scim:read' | 'scim:write') {
  try {
    await ApiKeyService.verifyFromAuthHeader(request, tenantId, scope);
    return null;
  } catch {
    return scimError(401, ScimMessages.INVALID_BEARER_TOKEN);
  }
}

/**
 * Group endpoints are stubs — we always answer 404 for reads and 501 for writes.
 * Returning 404 instead of 501 on GET matches what Okta expects when probing
 * for an individual group it can't find; it stops the IdP from looping.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { tenantId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:read');
  if (denied) return denied;
  return scimError(404, ScimMessages.GROUPS_NOT_IMPLEMENTED);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { tenantId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  return scimError(501, ScimMessages.GROUPS_NOT_IMPLEMENTED);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { tenantId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  return scimError(501, ScimMessages.GROUPS_NOT_IMPLEMENTED);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { tenantId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  return scimError(501, ScimMessages.GROUPS_NOT_IMPLEMENTED);
}
