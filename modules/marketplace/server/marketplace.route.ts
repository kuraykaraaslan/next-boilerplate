// path: app/tenant/[tenantId]/api/marketplace/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { listCatalog } from '@kuraykaraaslan/marketplace/server/marketplace.service.next';

/**
 * GET /tenant/[tenantId]/api/marketplace
 * Catalog of installable modules with per-tenant install + active state. Admin-only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const modules = await listCatalog(tenantId);
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load marketplace' },
      { status: 500 },
    );
  }
}
