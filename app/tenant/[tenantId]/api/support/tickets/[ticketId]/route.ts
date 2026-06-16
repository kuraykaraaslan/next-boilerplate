import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { SupportTicketService, TicketActionDTO } from '@nb/support';

/**
 * GET /tenant/[tenantId]/api/support/tickets/[ticketId]
 * Fetch a ticket with its full message thread, including internal notes (admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; ticketId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, ticketId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    // Admin read sees internal notes.
    return NextResponse.json({ ticket: await SupportTicketService.get(tenantId, ticketId, true) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * PATCH /tenant/[tenantId]/api/support/tickets/[ticketId]
 * Assign, change status, resolve, or close a ticket (admin).
 * Body: { action: 'assign', assignedToUserId } | { action: 'status', status }
 *     | { action: 'resolve' } | { action: 'close' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; ticketId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, ticketId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const parsed = TicketActionDTO.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    let ticket;
    switch (parsed.data.action) {
      case 'assign':
        ticket = await SupportTicketService.assign(tenantId, ticketId, parsed.data.assignedToUserId ?? null, user.userId);
        break;
      case 'status':
        ticket = await SupportTicketService.setStatus(tenantId, ticketId, parsed.data.status!, user.userId);
        break;
      case 'resolve':
        ticket = await SupportTicketService.resolve(tenantId, ticketId, user.userId);
        break;
      case 'close':
        ticket = await SupportTicketService.close(tenantId, ticketId, user.userId);
        break;
    }
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
