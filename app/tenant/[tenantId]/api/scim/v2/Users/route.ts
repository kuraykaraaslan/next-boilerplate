import { NextRequest } from 'next/server';
import ApiKeyService from '@/modules/api_key/api_key.service';
import ScimService from '@/modules/scim/scim.service';
import { CreateScimUserDTO } from '@/modules/scim/scim.dto';
import { scimError, scimResponse } from '@/modules/scim/scim.errors';
import ScimMessages from '@/modules/scim/scim.messages';
import type { ScimErrorType } from '@/modules/scim/scim.types';

/**
 * GET /tenant/{tenantId}/api/scim/v2/Users
 * RFC 7644 §3.4.2 — list users with optional `filter`, `startIndex`, `count`.
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
    const filter = searchParams.get('filter') ?? undefined;
    const startIndex = parseInt(searchParams.get('startIndex') || '1', 10);
    const count = parseInt(searchParams.get('count') || '100', 10);

    const list = await ScimService.listUsers(tenantId, { filter, startIndex, count });
    return scimResponse(list);
  } catch (err: any) {
    const status = err?.status ?? 500;
    return scimError(status, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
  }
}

/**
 * POST /tenant/{tenantId}/api/scim/v2/Users
 * RFC 7644 §3.3 — create a user. Returns 201 + Location header.
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
  try {
    body = await request.json();
  } catch {
    return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax');
  }

  const parsed = CreateScimUserDTO.safeParse(body);
  if (!parsed.success) {
    return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidValue');
  }

  try {
    const user = await ScimService.createUser(tenantId, parsed.data);
    return scimResponse(user, {
      status: 201,
      location: `/tenant/${tenantId}/api/scim/v2/Users/${user.id}`,
      etag: user.meta.version,
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return scimError(status, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
  }
}
