import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { SupportTicketService, CreateTicketDTO, ListTicketsQuery } from '@/modules/support';

/**
 * GET /tenant/[tenantId]/api/support/tickets
 * List support tickets (admin).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const { searchParams } = new URL(request.url);
    const parsed = ListTicketsQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json(await SupportTicketService.list(tenantId, parsed.data), { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/support/tickets
 * Open a support ticket. Any authenticated tenant user (a requester) may open
 * one; the requester id + email default to the caller when not supplied.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = CreateTicketDTO.safeParse({
      requesterUserId: user.userId,
      requesterEmail: user.email,
      ...body,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ ticket: await SupportTicketService.createTicket(tenantId, parsed.data) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
