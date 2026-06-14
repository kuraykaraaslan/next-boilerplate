import { NextRequest } from 'next/server';
import ApiKeyService from '@/modules/api_key/api_key.service';
import ScimService from '@/modules/scim/scim.service';
import { CreateScimGroupDTO } from '@/modules/scim/scim.dto';
import { ScimPatchBodySchema } from '@/modules/scim/scim.types';
import { scimError, scimResponse } from '@/modules/scim/scim.errors';
import ScimMessages from '@/modules/scim/scim.messages';
import type { ScimErrorType } from '@/modules/scim/scim.types';

type Ctx = { params: Promise<{ tenantId: string; scimGroupId: string }> };

async function authOr401(request: NextRequest, tenantId: string, scope: 'scim:read' | 'scim:write') {
  try {
    await ApiKeyService.verifyFromAuthHeader(request, tenantId, scope);
    return null;
  } catch {
    return scimError(401, ScimMessages.INVALID_BEARER_TOKEN);
  }
}

function fail(err: any) {
  return scimError(err?.status ?? err?.statusCode ?? 500, err?.message ?? ScimMessages.INTERNAL_ERROR, err?.scimType as ScimErrorType | undefined);
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimGroupId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:read');
  if (denied) return denied;
  try {
    return scimResponse(await ScimService.getGroup(tenantId, scimGroupId));
  } catch (err: any) { return fail(err); }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimGroupId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax'); }
  const parsed = CreateScimGroupDTO.safeParse(body);
  if (!parsed.success) return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidValue');
  try {
    return scimResponse(await ScimService.replaceGroup(tenantId, scimGroupId, parsed.data));
  } catch (err: any) { return fail(err); }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimGroupId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return scimError(400, ScimMessages.INVALID_PAYLOAD, 'invalidSyntax'); }
  const parsed = ScimPatchBodySchema.safeParse(body);
  if (!parsed.success) return scimError(400, parsed.error.issues.map((i) => i.message).join('; '), 'invalidValue');
  try {
    return scimResponse(await ScimService.patchGroup(tenantId, scimGroupId, parsed.data.Operations));
  } catch (err: any) { return fail(err); }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { tenantId, scimGroupId } = await params;
  const denied = await authOr401(request, tenantId, 'scim:write');
  if (denied) return denied;
  try {
    await ScimService.deleteGroup(tenantId, scimGroupId);
    return new Response(null, { status: 204 });
  } catch (err: any) { return fail(err); }
}
