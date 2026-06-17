// path: app/tenant/[tenantId]/api/marketplace/listings/[listingId]/versions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { submitVersion } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/** POST — submit a new version of a listing for review. Admin-only. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; listingId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, listingId } = await params;
    const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const body = await request.json();
    if (typeof body?.version !== 'string' || typeof body?.manifestJson !== 'string') {
      return NextResponse.json({ success: false, message: 'Body must include { version, manifestJson }' }, { status: 400 });
    }
    const version = await submitVersion(tenantId, listingId, body, session?.user?.userId);
    return NextResponse.json({ success: true, version });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to submit version' }, { status: 400 });
  }
}
