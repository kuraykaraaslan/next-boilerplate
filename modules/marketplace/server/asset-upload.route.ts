// path: app/tenant/[tenantId]/api/marketplace/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { uploadListingAsset } from '@kuraykaraaslan/marketplace/server/publish.service.next';

/** POST — upload a listing asset (e.g. screenshot) as base64; returns its public URL. Verified publishers only. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    const body = await request.json();
    if (typeof body?.base64 !== 'string' || typeof body?.filename !== 'string') {
      return NextResponse.json({ success: false, message: 'Body must include { base64, filename }' }, { status: 400 });
    }
    const asset = await uploadListingAsset(tenantId, body.base64, body.filename, body.contentType);
    return NextResponse.json({ success: true, asset });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to upload asset' }, { status: 400 });
  }
}
