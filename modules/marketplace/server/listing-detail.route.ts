// path: app/tenant/[tenantId]/api/marketplace/listings/[listingId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import {
  getMyListingDetail,
  setListingLifecycle,
  upsertListing,
  listMyListings,
} from '@kuraykaraaslan/marketplace/server/publish.service.next';

type Params = Promise<{ tenantId: string; listingId: string }>;

/** GET — detail (metadata + version history + install stats) for an owned listing. Admin-only. */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, listingId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const detail = await getMyListingDetail(tenantId, listingId);
    return NextResponse.json({ success: true, ...detail });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 400 });
  }
}

/**
 * PUT — either a lifecycle action (`{ action: 'unpublish' | 'republish' }`) or a
 * metadata edit (any of name/description/icon/tier/tags/repoUrl/homepage/visibility).
 * Admin-only, verified publisher.
 */
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, listingId } = await params;
    const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const actorId = session?.user?.userId;
    const body = await request.json();

    if (body?.action === 'unpublish' || body?.action === 'republish') {
      const listing = await setListingLifecycle(tenantId, listingId, body.action, actorId);
      const listings = await listMyListings(tenantId);
      return NextResponse.json({ success: true, listing, listings });
    }

    // Metadata edit. moduleId is immutable post-create; re-send the listing's own.
    if (typeof body?.moduleId !== 'string' || typeof body?.name !== 'string') {
      return NextResponse.json({ success: false, message: 'Body must include { moduleId, name } or { action }' }, { status: 400 });
    }
    const listing = await upsertListing(tenantId, { ...body, listingId }, actorId);
    const listings = await listMyListings(tenantId);
    return NextResponse.json({ success: true, listing, listings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update listing' }, { status: 400 });
  }
}
