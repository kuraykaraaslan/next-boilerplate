import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { BackOfficeService, TicketActionDTO } from '@/modules/back_office';

/**
 * GET /tenant/[tenantId]/api/back-office/support/tickets/[ticketId]
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
    return NextResponse.json({ ticket: await BackOfficeService.getTicket(tenantId, ticketId, true) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * PATCH /tenant/[tenantId]/api/back-office/support/tickets/[ticketId]
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
        ticket = await BackOfficeService.assignTicket(tenantId, ticketId, parsed.data.assignedToUserId ?? null, user.userId);
        break;
      case 'status':
        ticket = await BackOfficeService.setTicketStatus(tenantId, ticketId, parsed.data.status!, user.userId);
        break;
      case 'resolve':
        ticket = await BackOfficeService.resolveTicket(tenantId, ticketId, user.userId);
        break;
      case 'close':
        ticket = await BackOfficeService.closeTicket(tenantId, ticketId, user.userId);
        break;
    }
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
