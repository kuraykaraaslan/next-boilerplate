import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import MessagingCrudService from '@nb/messaging/server/messaging.crud.service';

/**
 * GET /tenant/[tenantId]/api/conversations/[conversationId]
 * Fetch one conversation with its active participants (participants only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, conversationId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const conversation = await MessagingCrudService.getConversation(tenantId, user.userId, conversationId);
    return NextResponse.json({ conversation }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
