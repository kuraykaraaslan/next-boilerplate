import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import MessagingTicketService from '@kuraykaraaslan/messaging/server/messaging.ticket.service';
import { env } from '@kuraykaraaslan/env';

/**
 * POST /tenant/[tenantId]/api/messaging/ws-ticket
 * Mint a short-lived, single-use ticket the browser presents on the Socket.IO
 * handshake. Authenticated via the normal tenant session, so the ticket is
 * bound to a verified {tenantId, userId}.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const { ticket, expiresIn } = await MessagingTicketService.mintTicket(tenantId, user.userId);
    return NextResponse.json(
      { ticket, expiresIn, wsUrl: env.MESSAGING_WS_PUBLIC_URL ?? null },
      { status: 201 },
    );
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
