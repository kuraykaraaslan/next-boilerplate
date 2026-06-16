import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import MessagingModerationService from '@nb/messaging/server/messaging.moderation.service';
import { ModerateMessageDTO } from '@nb/messaging/server/messaging.dto';

/**
 * POST /tenant/[tenantId]/api/messaging/moderation/messages/[messageId]
 * Apply a moderator action (approve | reject | hide | dismiss) (ADMIN+).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; messageId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, messageId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const body = await request.json();
    const parsed = ModerateMessageDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const message = await MessagingModerationService.moderate(tenantId, user.userId, messageId, parsed.data);
    return NextResponse.json({ message }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
