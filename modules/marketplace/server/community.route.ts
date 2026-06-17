// path: app/tenant/[tenantId]/api/marketplace/community/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { listPublicListings } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/**
 * GET — public, approved community listings for the consumer catalog. Listing-only
 * (code is not executed by the platform in this phase). Admin-only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const listings = await listPublicListings();
    return NextResponse.json({ success: true, listings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 500 });
  }
}
