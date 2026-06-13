import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import MessagingCrudService from '@/modules/messaging/messaging.crud.service';
import { AddParticipantDTO } from '@/modules/messaging/messaging.dto';

/**
 * POST /tenant/[tenantId]/api/conversations/[conversationId]/participants
 * Add a participant to a group conversation (owner/admin only).
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
    const parsed = AddParticipantDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const participant = await MessagingCrudService.addParticipant(tenantId, user.userId, conversationId, parsed.data);
    return NextResponse.json({ participant }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/conversations/[conversationId]/participants?userId=...
 * Remove a participant (owner/admin), or leave the conversation yourself.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, conversationId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    if (!targetUserId) {
      return NextResponse.json({ message: 'userId query parameter is required.' }, { status: 400 });
    }

    await MessagingCrudService.removeParticipant(tenantId, user.userId, conversationId, targetUserId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
