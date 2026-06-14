import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { BackOfficeService, ReplyTicketDTO } from '@/modules/back_office';

/**
 * POST /tenant/[tenantId]/api/back-office/support/tickets/[ticketId]/messages
 * Post a reply to a ticket. Any authenticated tenant user may reply; the
 * authorType is derived from the caller's role — tenant staff (ADMIN / OWNER)
 * or a global admin reply as an AGENT, everyone else as the REQUESTER. Only
 * agents may post internal notes (the flag is forced off for requesters).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; ticketId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, ticketId } = await params;
    const { user, tenantMember, isGlobalAdmin } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const isAgent =
      isGlobalAdmin || tenantMember.memberRole === 'ADMIN' || tenantMember.memberRole === 'OWNER';
    const body = (await request.json()) as Record<string, unknown>;

    const parsed = ReplyTicketDTO.safeParse({
      ...body,
      ticketId,
      authorUserId: user.userId,
      // Server-derived: callers cannot spoof their authorType.
      authorType: isAgent ? 'AGENT' : 'REQUESTER',
      // Requesters can never post internal notes.
      internal: isAgent ? body['internal'] : false,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ message: await BackOfficeService.replyTicket(tenantId, parsed.data) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
