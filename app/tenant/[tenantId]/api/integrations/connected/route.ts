import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@/modules/integrations_hub/integrations_hub.service';
import { ListConnectedAppsQuerySchema } from '@/modules/integrations_hub/integrations_hub.dto';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@/modules/integrations_hub/integrations_hub.messages';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';

/** GET /tenant/[tenantId]/api/integrations/connected — list connected apps (admin). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = ListConnectedAppsQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      connectorKey: searchParams.get('connectorKey') || undefined,
      status: searchParams.get('status') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const result = await IntegrationsHubService.listConnectedApps(tenantId, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
