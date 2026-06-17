import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';

/**
 * POST /tenant/[tenantId]/api/api-keys/sweep-expired
 * Deactivate any keys past their expiry that are still flagged active and emit
 * `api_key.expired` webhooks (ADMIN+). Intended to be hit by a scheduled job;
 * verification already rejects expired keys at request time, so this is about
 * state hygiene and notifying webhook consumers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    });

    const sweptCount = await ApiKeyService.sweepExpired(tenantId);
    return NextResponse.json({ sweptCount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode ?? 500 });
  }
}
