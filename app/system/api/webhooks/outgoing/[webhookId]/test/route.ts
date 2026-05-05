import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import UserSessionNextService from '@/modules/user_session/user_session.service.next';
import SystemWebhookService from '@/modules/webhook/webhook.system.service';

/**
 * POST /system/api/webhooks/outgoing/[webhookId]/test
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { webhookId } = await params;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    const delivery = await SystemWebhookService.sendTest(webhookId);
    return NextResponse.json({ delivery }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
