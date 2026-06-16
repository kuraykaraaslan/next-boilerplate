import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server';
import IntegrationsHubService from '@nb/integrations_hub/server/integrations_hub.service';
import { BeginOAuthRequestSchema } from '@nb/integrations_hub/server/integrations_hub.dto';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from '@nb/integrations_hub/server/integrations_hub.messages';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';

/** POST /tenant/[tenantId]/api/integrations/oauth/start — begin an OAuth connect (admin). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params;
    let userId: string;
    try {
      const session = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
      userId = session.user.userId;
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const body = await request.json();
    const parsed = BeginOAuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      );
    }

    const result = await IntegrationsHubService.beginOAuthConnect(tenantId, userId, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || MSG.CONNECT_FAILED },
      { status: error.statusCode || 500 },
    );
  }
}
