import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';

/**
 * POST /tenant/[tenantId]/api/webhooks/[webhookId]/deliveries/[deliveryId]/redeliver
 * Re-queue a failed delivery (ADMIN+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; webhookId: string; deliveryId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, webhookId, deliveryId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    await WebhookService.redeliver(tenantId, webhookId, deliveryId);
    return NextResponse.json({ message: 'Webhook redelivery queued.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
