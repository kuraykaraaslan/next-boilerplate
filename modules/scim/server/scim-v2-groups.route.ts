import { NextRequest } from 'next/server';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';
import ScimService from '@kuraykaraaslan/scim/server/scim.service';
import { CreateScimGroupDTO } from '@kuraykaraaslan/scim/server/scim.dto';
import { scimError, scimResponse } from '@kuraykaraaslan/scim/server/scim.errors';
import ScimMessages from '@kuraykaraaslan/scim/server/scim.messages';
import type { ScimErrorType } from '@kuraykaraaslan/scim/server/scim.types';

/**
 * GET /tenant/{tenantId}/api/scim/v2/Groups
 * RFC 7644 §3.4.2 — list provisioned groups (empty when Groups are disabled).
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
  try {
    const { searchParams } = new URL(request.url);
    const startIndex = parseInt(searchParams.get('startIndex') || '1', 10);
    const count = parseInt(searchParams.get('count') || '100', 10);
    const idp = searchParams.get('idp') ?? undefined;
    const list = await ScimService.listGroups(tenantId, { startIndex, count, idp });
    return scimResponse(list);
  } catch (err: any) {
    return scimError(err?.status ?? err?.statusCode ?? 500, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
  }
}

/**
 * POST /tenant/{tenantId}/api/scim/v2/Groups
 * RFC 7644 §3.3 — create a group (501 when Groups are disabled for the tenant).
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
  let body: unknown;
  try { body = await request.json(); } catch { return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax'); }
  const parsed = CreateScimGroupDTO.safeParse(body);
  if (!parsed.success) {
    return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidValue');
  }
  try {
    const idp = new URL(request.url).searchParams.get('idp') ?? undefined;
    const group = await ScimService.createGroup(tenantId, { ...parsed.data, idp });
    return scimResponse(group, {
      status: 201,
      location: `/tenant/${tenantId}/api/scim/v2/Groups/${group.id}`,
      etag: group.meta.version,
    });
  } catch (err: any) {
    return scimError(err?.status ?? err?.statusCode ?? 500, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
  }
}
