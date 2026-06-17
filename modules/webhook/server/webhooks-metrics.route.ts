import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';

/**
 * GET /tenant/[tenantId]/api/webhooks/metrics?webhookId=&days=7
 * Aggregate delivery metrics for the tenant (or one webhook) over a window (ADMIN+).
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

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId') || undefined;
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10) || 7, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await WebhookService.getMetrics(tenantId, { webhookId, since });
    return NextResponse.json({ metrics, days }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
