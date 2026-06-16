import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@nb/integrations_hub/server/integrations_hub.service';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@nb/integrations_hub/server/integrations_hub.messages';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';

type Params = { params: Promise<{ tenantId: string; connectedAppId: string }> };

/** GET — connected app + recent event log (admin). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId, connectedAppId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const [connectedApp, events] = await Promise.all([
      IntegrationsHubService.getConnectedApp(tenantId, connectedAppId),
      IntegrationsHubService.listEvents(tenantId, connectedAppId),
    ]);
    return NextResponse.json({ success: true, connectedApp, events });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTED_APP_NOT_FOUND },
      { status: error.statusCode || 500 },
    );
  }
}

/** DELETE — disconnect (admin). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, connectedAppId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    await IntegrationsHubService.disconnect(tenantId, connectedAppId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.DISCONNECT_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
