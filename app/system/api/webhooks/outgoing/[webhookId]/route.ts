import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SystemWebhookService from '@/modules/webhook/webhook.system.service';
import { UpdateWebhookDTO } from '@/modules/webhook/webhook.dto';

/**
 * GET /system/api/webhooks/outgoing/[webhookId]
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

    const webhook = await SystemWebhookService.getById(webhookId);
    return NextResponse.json({ webhook }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PATCH /system/api/webhooks/outgoing/[webhookId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { webhookId } = await params;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    const body = await request.json();
    const parsed = UpdateWebhookDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const webhook = await SystemWebhookService.update(webhookId, parsed.data);
    return NextResponse.json({ webhook }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/webhooks/outgoing/[webhookId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { webhookId } = await params;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    await SystemWebhookService.delete(webhookId);
    return NextResponse.json({ message: 'Webhook deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
