import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SystemWebhookService from '@/modules/webhook/webhook.system.service';
import { CreateWebhookDTO, ListWebhooksDTO } from '@/modules/webhook/webhook.dto';

/**
 * GET /system/api/webhooks/outgoing
 * List system webhook endpoints (ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: 'ADMIN',
    });

    const { searchParams } = new URL(request.url);
    const parsed = ListWebhooksDTO.safeParse({
      tenantId: '00000000-0000-0000-0000-000000000000', // placeholder — not used by system service
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { webhooks, total } = await SystemWebhookService.list({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return NextResponse.json({ webhooks, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /system/api/webhooks/outgoing
 * Create a new system webhook endpoint (ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: 'ADMIN',
    });

    const body = await request.json();
    const parsed = CreateWebhookDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const webhook = await SystemWebhookService.create(user.userId, parsed.data);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
