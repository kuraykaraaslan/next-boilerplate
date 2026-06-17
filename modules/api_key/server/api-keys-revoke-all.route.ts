import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';
import ApiKeyMessages from '@kuraykaraaslan/api_key/server/api_key.messages';

/**
 * POST /tenant/[tenantId]/api/api-keys/revoke-all
 * Emergency incident-response endpoint — instantly deactivates every active
 * API key for the tenant and flushes their caches (ADMIN+).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    });

    const revokedCount = await ApiKeyService.revokeAll(tenantId, user.userId);
    return NextResponse.json({ message: ApiKeyMessages.REVOKE_ALL_SUCCESS, revokedCount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode ?? 500 });
  }
}
