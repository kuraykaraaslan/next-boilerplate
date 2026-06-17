import { NextRequest, NextResponse } from 'next/server';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';
import ScimService from '@kuraykaraaslan/scim/server/scim.service';
import { scimError } from '@kuraykaraaslan/scim/server/scim.errors';
import ScimMessages from '@kuraykaraaslan/scim/server/scim.messages';

/**
 * GET /tenant/{tenantId}/api/scim/v2/Health
 * SCIM provisioning health check — IdPs / monitors poll this to verify the
 * provider is reachable and functional. Requires a valid SCIM read token.
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
  const health = await ScimService.health(tenantId);
  return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
