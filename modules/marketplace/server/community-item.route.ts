// path: app/tenant/[tenantId]/api/marketplace/community/[listingId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import {
  installCommunity,
  setCommunityActive,
  uninstallCommunity,
} from '@kuraykaraaslan/marketplace/server/community-install.service.next';

/**
 * PUT /tenant/[tenantId]/api/marketplace/community/[listingId]
 *   { action: 'install' | 'activate' | 'deactivate' | 'uninstall' }
 * Manage a sandboxed community plugin for this tenant. Admin-only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; listingId: string }> },
) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;
    const { tenantId, listingId } = await params;
    const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const actorId = session?.user?.userId;
    const action = (await request.json())?.action;

    if (action === 'install') { await installCommunity(tenantId, listingId, actorId); return NextResponse.json({ success: true }); }
    if (action === 'activate') { await setCommunityActive(tenantId, listingId, true, actorId); return NextResponse.json({ success: true }); }
    if (action === 'deactivate') { await setCommunityActive(tenantId, listingId, false, actorId); return NextResponse.json({ success: true }); }
    if (action === 'uninstall') { const r = await uninstallCommunity(tenantId, listingId, actorId); return NextResponse.json({ success: true, ...r }); }
    return NextResponse.json({ success: false, message: "action must be install|activate|deactivate|uninstall" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 400 });
  }
}
