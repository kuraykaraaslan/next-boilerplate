import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import MessagingLifecycleService from '@/modules/messaging/messaging.lifecycle.service';
import { MarkReadDTO } from '@/modules/messaging/messaging.dto';

/**
 * POST /tenant/[tenantId]/api/conversations/[conversationId]/read
 * Advance the caller's read cursor (HTTP fallback for the WS `read` event).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, conversationId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = await request.json();
    const parsed = MarkReadDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const result = await MessagingLifecycleService.markRead(tenantId, user.userId, conversationId, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
