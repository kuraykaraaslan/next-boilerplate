import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import WebhookCrudService from '@kuraykaraaslan/webhook/server/webhook.crud.service';

/**
 * POST /tenant/[tenantId]/api/webhooks/[webhookId]/rotate-secret
 *
 * Rotates a webhook's HMAC signing secret. The previous secret is retained for
 * an overlap window (default 48h) so subscribers can update their verifier
 * without dropping events — during the window both `X-Webhook-Signature` and
 * `X-Webhook-Signature-Prev` are emitted.
 *
 * Returns the new secret in the response body **exactly once**. Persist it on
 * the client side immediately — subsequent reads of the webhook never expose
 * the raw value.
 *
 * Optional body: `{ "overlapHours": number }` (default 48, range 1..168).
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

    let overlapMs = 48 * 60 * 60 * 1000;
    try {
      const body = await request.json();
      if (typeof body?.overlapHours === 'number' && body.overlapHours > 0 && body.overlapHours <= 168) {
        overlapMs = body.overlapHours * 60 * 60 * 1000;
      }
    } catch {
      // Empty body is fine — use default.
    }

    const { webhook, newSecret } = await WebhookCrudService.rotateSecret(tenantId, webhookId, overlapMs);

    return NextResponse.json(
      {
        webhook,
        // ⚠️ Returned exactly once — clients MUST capture it now.
        newSecret,
        overlapMs,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
