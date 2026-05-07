import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';
import { ListDeliveriesDTO } from '@/modules/webhook/webhook.dto';

/**
 * GET /tenant/[tenantId]/api/webhooks/[webhookId]/deliveries
 * List delivery attempts for a webhook (ADMIN+)
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const parsed = ListDeliveriesDTO.safeParse({
      tenantId,
      webhookId,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { deliveries, total } = await WebhookService.listDeliveries(parsed.data);
    return NextResponse.json({ deliveries, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
