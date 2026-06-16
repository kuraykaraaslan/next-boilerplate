// path: app/tenant/[tenantId]/api/modules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import {
  listModulesWithState,
  setModuleEnabled,
} from '@nb/setting/server/module-activation.service.next';

/**
 * GET /tenant/[tenantId]/api/modules
 * Lists every module with its per-tenant enabled state. Admin-only.
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

    const modules = await listModulesWithState(tenantId);
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list modules' },
      { status: 500 },
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/modules  { id: string, enabled: boolean }
 * Toggles a module on/off for this tenant. Admin-only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    const session = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : null;
    if (!id || enabled === null) {
      return NextResponse.json(
        { success: false, message: 'Body must be { id: string, enabled: boolean }' },
        { status: 400 },
      );
    }

    await setModuleEnabled(tenantId, id, enabled, session?.user?.userId);
    const modules = await listModulesWithState(tenantId);
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update module' },
      { status: 500 },
    );
  }
}
