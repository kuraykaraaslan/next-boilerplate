import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';

/**
 * POST /tenant/[tenantId]/api/webhooks/[webhookId]/deliveries/replay-dead-letter
 *
 * Bulk-replays every `DEAD_LETTERED` delivery for a webhook. Each replay
 * resets `attempts` to 0 and re-queues the original payload — the receiver
 * will see the same event body it would have seen the first time. Useful
 * after a subscriber outage to drain the dead-letter queue in one shot.
 *
 * Auth: tenant ADMIN.
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
      requiredTenantRole: 'ADMIN',
      tenantId,
    });

    const replayed = await WebhookService.replayDeadLettered(tenantId, webhookId);
    return NextResponse.json({ message: `${replayed} dead-lettered deliveries re-queued.`, replayed }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
