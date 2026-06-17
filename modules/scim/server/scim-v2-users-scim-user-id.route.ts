import { NextRequest } from 'next/server';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';
import ScimService from '@kuraykaraaslan/scim/server/scim.service';
import { UpdateScimUserDTO, PatchScimUserDTO } from '@kuraykaraaslan/scim/server/scim.dto';
import { scimError, scimResponse, scimNoContent } from '@kuraykaraaslan/scim/server/scim.errors';
import ScimMessages from '@kuraykaraaslan/scim/server/scim.messages';
import type { ScimErrorType } from '@kuraykaraaslan/scim/server/scim.types';

type Ctx = { params: Promise<{ tenantId: string; scimUserId: string }> };

async function authOr401(request: NextRequest, tenantId: string, scope: 'scim:read' | 'scim:write') {
  try {
    await ApiKeyService.verifyFromAuthHeader(request, tenantId, scope);
    return null;
  } catch {
    return scimError(401, ScimMessages.INVALID_BEARER_TOKEN);
  }
}

function errorToScim(err: any) {
  const status = err?.status ?? 500;
  return scimError(status, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
}

/**
 * GET /tenant/{tenantId}/api/scim/v2/Users/{scimUserId}
 * RFC 7644 §3.4.1 — retrieve a single user.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimUserId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:read');
  if (denied) return denied;

  try {
    const user = await ScimService.getUser(tenantId, scimUserId);
    return scimResponse(user, { etag: user.meta.version });
  } catch (err: any) {
    return errorToScim(err);
  }
}

/**
 * PUT /tenant/{tenantId}/api/scim/v2/Users/{scimUserId}
 * RFC 7644 §3.5.1 — full replacement of a user.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimUserId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax');
  }

  const parsed = UpdateScimUserDTO.safeParse(body);
  if (!parsed.success) {
    return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidValue');
  }

  try {
    const user = await ScimService.updateUser(tenantId, scimUserId, parsed.data);
    return scimResponse(user, { etag: user.meta.version });
  } catch (err: any) {
    return errorToScim(err);
  }
}

/**
 * PATCH /tenant/{tenantId}/api/scim/v2/Users/{scimUserId}
 * RFC 7644 §3.5.2 — partial update via JSON-Patch-like operations.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimUserId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax');
  }

  const parsed = PatchScimUserDTO.safeParse(body);
  if (!parsed.success) {
    return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidSyntax');
  }

  try {
    const user = await ScimService.patchUser(tenantId, scimUserId, parsed.data.Operations);
    return scimResponse(user, { etag: user.meta.version });
  } catch (err: any) {
    return errorToScim(err);
  }
}

/**
 * DELETE /tenant/{tenantId}/api/scim/v2/Users/{scimUserId}
 * RFC 7644 §3.6 — deprovision. We soft-delete the TenantMember;
 * the cross-tenant User row is preserved.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimUserId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;

  try {
    await ScimService.deleteUser(tenantId, scimUserId);
    return scimNoContent();
  } catch (err: any) {
    return errorToScim(err);
  }
}
