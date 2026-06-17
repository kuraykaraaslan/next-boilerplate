// path: app/tenant/[tenantId]/api/marketplace/publisher/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { applyAsPublisher, getPublisherForTenant } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/** GET — this tenant's publisher account (or null). Admin-only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const publisher = await getPublisherForTenant(tenantId);
    return NextResponse.json({ success: true, publisher });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 500 });
  }
}

/** POST { slug, displayName, contact?, website? } — apply to become a publisher. Admin-only. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const body = await request.json();
    if (typeof body?.slug !== 'string' || typeof body?.displayName !== 'string') {
      return NextResponse.json({ success: false, message: 'Body must include { slug, displayName }' }, { status: 400 });
    }
    const publisher = await applyAsPublisher(
      tenantId,
      { slug: body.slug, displayName: body.displayName, contact: body.contact, website: body.website },
      session?.user?.userId,
    );
    return NextResponse.json({ success: true, publisher });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to apply' }, { status: 400 });
  }
}
