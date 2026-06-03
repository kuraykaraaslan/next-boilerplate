import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import { catalogForScope, groupedCatalogForScope, scopeForTenant } from '@/modules/webhook/webhook.catalog';

/**
 * GET /tenant/[tenantId]/api/webhooks/events
 * Returns the subscribable webhook event catalog for this tenant's scope (ADMIN+).
 * Root tenant → platform-wide events; regular tenant → tenant-local events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const scope = scopeForTenant(isRootTenant(tenantId));
    return NextResponse.json(
      {
        scope,
        events: catalogForScope(scope),
        groups: groupedCatalogForScope(scope),
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
