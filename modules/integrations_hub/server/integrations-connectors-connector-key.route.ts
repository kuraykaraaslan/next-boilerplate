import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@nb/integrations_hub/server/integrations_hub.service';
import { UpsertConnectorRequestSchema } from '@nb/integrations_hub/server/integrations_hub.dto';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@nb/integrations_hub/server/integrations_hub.messages';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';

type Params = { params: Promise<{ tenantId: string; connectorKey: string }> };

/** GET /tenant/[tenantId]/api/integrations/connectors/[connectorKey] (admin). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId, connectorKey } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const connector = await IntegrationsHubService.getConnector(tenantId, connectorKey);
    return NextResponse.json({ success: true, connector });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/** PUT — upsert connector (admin). */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, connectorKey } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpsertConnectorRequestSchema.safeParse({ ...body, key: connectorKey });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const connector = await IntegrationsHubService.upsertConnector(tenantId, parsed.data);
    return NextResponse.json({ success: true, connector });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_SAVE_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/** DELETE — remove connector (admin). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { tenantId, connectorKey } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    await IntegrationsHubService.deleteConnector(tenantId, connectorKey);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_SAVE_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
