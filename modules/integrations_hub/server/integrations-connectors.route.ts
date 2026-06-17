import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@kuraykaraaslan/integrations_hub/server/integrations_hub.service';
import { UpsertConnectorRequestSchema } from '@kuraykaraaslan/integrations_hub/server/integrations_hub.dto';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@kuraykaraaslan/integrations_hub/server/integrations_hub.messages';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

/** GET /tenant/[tenantId]/api/integrations/connectors — list catalog (admin). */
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

    const connectors = await IntegrationsHubService.listConnectors(tenantId);
    return NextResponse.json({ success: true, connectors });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_FETCH_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}

/** POST /tenant/[tenantId]/api/integrations/connectors — upsert a connector (admin). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpsertConnectorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const connector = await IntegrationsHubService.upsertConnector(tenantId, parsed.data);
    return NextResponse.json({ success: true, connector }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECTOR_SAVE_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
