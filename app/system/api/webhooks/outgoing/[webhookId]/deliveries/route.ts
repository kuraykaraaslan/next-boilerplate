import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SystemWebhookService from '@/modules/webhook/webhook.system.service';

/**
 * GET /system/api/webhooks/outgoing/[webhookId]/deliveries
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { webhookId } = await params;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const { deliveries, total } = await SystemWebhookService.listDeliveries({ webhookId, page, pageSize });
    return NextResponse.json({ deliveries, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
