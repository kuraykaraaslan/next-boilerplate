import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/libs/limiter';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import WebhookService from '@/modules/webhook/webhook.service';
import { UpdateWebhookDTO } from '@/modules/webhook/webhook.dto';

/**
 * GET /tenant/[tenantId]/api/webhooks/[webhookId]
 * Get a single webhook endpoint (ADMIN+)
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

    const webhook = await WebhookService.getById(tenantId, webhookId);
    return NextResponse.json({ webhook }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PATCH /tenant/[tenantId]/api/webhooks/[webhookId]
 * Update a webhook endpoint (ADMIN+)
 */
export async function PATCH(
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
    const parsed = UpdateWebhookDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    const webhook = await WebhookService.update(tenantId, webhookId, parsed.data);
    return NextResponse.json({ webhook }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/webhooks/[webhookId]
 * Delete a webhook endpoint (ADMIN+)
 */
export async function DELETE(
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

    await WebhookService.delete(tenantId, webhookId);
    return NextResponse.json({ message: 'Webhook deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
