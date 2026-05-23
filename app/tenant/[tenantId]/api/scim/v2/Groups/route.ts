import { NextRequest } from 'next/server';
import ApiKeyService from '@/modules/api_key/api_key.service';
import ScimService from '@/modules/scim/scim.service';
import { scimError, scimResponse } from '@/modules/scim/scim.errors';
import ScimMessages from '@/modules/scim/scim.messages';

/**
 * GET /tenant/{tenantId}/api/scim/v2/Groups
 * Returns an empty list — SCIM Groups are not yet mapped onto our
 * tenant role model. Most IdPs accept an empty response gracefully.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  try {
    await ApiKeyService.verifyFromAuthHeader(request, tenantId, 'scim:read');
  } catch {
    return scimError(401, ScimMessages.INVALID_BEARER_TOKEN);
  }

  const { searchParams } = new URL(request.url);
  const startIndex = parseInt(searchParams.get('startIndex') || '1', 10);
  const count = parseInt(searchParams.get('count') || '100', 10);
  const list = await ScimService.listGroups(tenantId, { startIndex, count });
  return scimResponse(list);
}

/**
 * POST /tenant/{tenantId}/api/scim/v2/Groups
 * SCIM Groups are not implemented — RFC 7644 §3.12 allows `501 Not Implemented`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  try {
    await ApiKeyService.verifyFromAuthHeader(request, tenantId, 'scim:write');
  } catch {
    return scimError(401, ScimMessages.INVALID_BEARER_TOKEN);
  }
  return scimError(501, ScimMessages.GROUPS_NOT_IMPLEMENTED);
}
