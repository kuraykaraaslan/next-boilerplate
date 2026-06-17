import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import MessagingModerationService from '@kuraykaraaslan/messaging/server/messaging.moderation.service';
import { ModerationQueueDTO } from '@kuraykaraaslan/messaging/server/messaging.dto';

/**
 * GET /tenant/[tenantId]/api/messaging/moderation/queue
 * Moderator review queue: FLAGGED + PENDING messages and OPEN reports (ADMIN+).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const { searchParams } = new URL(request.url);
    const parsed = ModerationQueueDTO.safeParse({
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const result = await MessagingModerationService.listQueue(tenantId, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
