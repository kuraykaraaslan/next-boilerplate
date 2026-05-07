import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';
import { CreateWebhookDTO, ListWebhooksDTO } from '@/modules/webhook/webhook.dto';

/**
 * GET /tenant/[tenantId]/api/webhooks
 * List webhook endpoints (ADMIN+)
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
    const parsed = ListWebhooksDTO.safeParse({
      tenantId,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const { webhooks, total } = await WebhookService.list(parsed.data);
    return NextResponse.json({ webhooks, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/webhooks
 * Create a new webhook endpoint (ADMIN+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const body = await request.json();
    const parsed = CreateWebhookDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const webhook = await WebhookService.create(tenantId, user.userId, parsed.data);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
