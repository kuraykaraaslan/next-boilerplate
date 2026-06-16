import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import MessagingModerationService from '@nb/messaging/server/messaging.moderation.service';
import { ReportMessageDTO } from '@nb/messaging/server/messaging.dto';

/**
 * POST /tenant/[tenantId]/api/conversations/[conversationId]/messages/[messageId]/report
 * Any participant can report a message. Idempotent per (message, reporter).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string; messageId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, conversationId, messageId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = await request.json();
    const parsed = ReportMessageDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const report = await MessagingModerationService.createReport(
      tenantId,
      user.userId,
      conversationId,
      messageId,
      parsed.data,
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
