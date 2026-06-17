// path: app/tenant/[tenantId]/api/marketplace/[moduleId]/install/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { install, listCatalog } from '@kuraykaraaslan/marketplace/server/marketplace.service.next';

/**
 * POST /tenant/[tenantId]/api/marketplace/[moduleId]/install
 * Installs a module (and its required deps) and activates it. Admin-only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; moduleId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, moduleId } = await params;

    const session = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    await install(tenantId, moduleId, session?.user?.userId);
    const modules = await listCatalog(tenantId);
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to install module' },
      { status: 400 },
    );
  }
}
