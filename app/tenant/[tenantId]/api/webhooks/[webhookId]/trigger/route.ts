import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';
import { TriggerWebhookDTO } from '@/modules/webhook/webhook.dto';

/**
 * POST /tenant/[tenantId]/api/webhooks/[webhookId]/trigger
 * Manually trigger a real catalog event with a sample payload against one endpoint
 * (ADMIN+). Enqueues an async delivery — distinct from /test which sends event:'test'.
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

    const body = await request.json();
    const parsed = TriggerWebhookDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    await WebhookService.triggerEvent(tenantId, webhookId, parsed.data.event, parsed.data.payload ?? {});
    return NextResponse.json({ message: 'Event triggered.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
