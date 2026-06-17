// path: app/tenant/[tenantId]/api/marketplace/[moduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import {
  setActive,
  purge,
  previewDelete,
  listCatalog,
} from '@kuraykaraaslan/marketplace/server/marketplace.service.next';

/**
 * GET /tenant/[tenantId]/api/marketplace/[moduleId]?preview=delete
 * Returns the tables/data that an uninstall would purge + blocking dependents.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; moduleId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, moduleId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const preview = await previewDelete(tenantId, moduleId);
    return NextResponse.json({ success: true, preview });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load preview' },
      { status: 500 },
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/marketplace/[moduleId]  { active: boolean }
 * Activates or deactivates an installed module (keeps data). Admin-only.
 */
export async function PUT(
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

    const body = await request.json();
    const active = typeof body?.active === 'boolean' ? body.active : null;
    if (active === null) {
      return NextResponse.json(
        { success: false, message: 'Body must be { active: boolean }' },
        { status: 400 },
      );
    }

    await setActive(tenantId, moduleId, active, session?.user?.userId);
    const modules = await listCatalog(tenantId);
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update module' },
      { status: 400 },
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/marketplace/[moduleId]  { cascade?: boolean }
 * Uninstalls a module and PURGES its per-tenant data. Admin-only.
 */
export async function DELETE(
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

    let cascade = false;
    try {
      const body = await request.json();
      cascade = body?.cascade === true;
    } catch { /* no body — default cascade=false */ }

    const result = await purge(tenantId, moduleId, session?.user?.userId, cascade);
    const modules = await listCatalog(tenantId);
    return NextResponse.json({ success: true, result, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to uninstall module' },
      { status: 400 },
    );
  }
}
