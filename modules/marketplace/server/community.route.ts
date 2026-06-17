// path: app/tenant/[tenantId]/api/marketplace/community/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { listPublicListings } from '@kuraykaraaslan/marketplace/server/publish.service.next';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { communityInstallKeys } from '@kuraykaraaslan/plugin_runtime/server/broker/install-keys';

/**
 * GET — public, approved community listings for the consumer catalog, annotated
 * with this tenant's install state. A listing is "runnable" once it has an approved
 * bundle; otherwise it is a directory entry only. Admin-only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const listings = await listPublicListings();
    const keys = listings.flatMap((l) => [communityInstallKeys.version(l.listingId), communityInstallKeys.active(l.listingId)]);
    const rec = keys.length ? await SettingService.getByKeys(tenantId, keys) : {};
    const annotated = listings.map((l) => ({
      ...l,
      installed: !!rec[communityInstallKeys.version(l.listingId)],
      active: rec[communityInstallKeys.active(l.listingId)] !== 'false' && !!rec[communityInstallKeys.version(l.listingId)],
    }));
    return NextResponse.json({ success: true, listings: annotated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed' }, { status: 500 });
  }
}
