import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import MessagingCrudService from '@nb/messaging/server/messaging.crud.service';
import MessagingLifecycleService from '@nb/messaging/server/messaging.lifecycle.service';
import { SendMessageDTO, ListMessagesDTO } from '@nb/messaging/server/messaging.dto';

/**
 * GET /tenant/[tenantId]/api/conversations/[conversationId]/messages
 * List messages (cursor-paginated, newest first). Participant-only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, conversationId } = await params;

    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });
    const isAdmin = tenantMember.memberRole === 'ADMIN' || tenantMember.memberRole === 'OWNER';

    const { searchParams } = new URL(request.url);
    const parsed = ListMessagesDTO.safeParse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const result = await MessagingCrudService.listMessages(tenantId, user.userId, conversationId, parsed.data, isAdmin);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/conversations/[conversationId]/messages
 * Send a message. Persists, then publishes a realtime event for WS fan-out.
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
    const parsed = SendMessageDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const message = await MessagingLifecycleService.sendMessage(tenantId, user.userId, conversationId, parsed.data);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
