// path: app/tenant/[tenantId]/api/marketplace/listings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { listMyListings, upsertListing } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/** GET — this publisher's listings. Admin-only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const listings = await listMyListings(tenantId);
    return NextResponse.json({ success: true, listings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 500 });
  }
}

/** POST — create or update a listing (draft). Admin-only, verified publisher. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const body = await request.json();
    if (typeof body?.moduleId !== 'string' || typeof body?.name !== 'string') {
      return NextResponse.json({ success: false, message: 'Body must include { moduleId, name }' }, { status: 400 });
    }
    const listing = await upsertListing(tenantId, body, session?.user?.userId);
    const listings = await listMyListings(tenantId);
    return NextResponse.json({ success: true, listing, listings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save listing' }, { status: 400 });
  }
}
