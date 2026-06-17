import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';

/**
 * POST /tenant/[tenantId]/api/webhooks/[webhookId]/test
 * Send a test delivery (ADMIN+). Executes synchronously and returns the delivery record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; webhookId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, webhookId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const delivery = await WebhookService.sendTest(tenantId, webhookId);
    return NextResponse.json({ delivery }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
