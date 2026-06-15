import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { ApprovalQueueService, ListApprovalsQuery, SubmitApprovalDTO } from '@/modules/approval';

/**
 * GET /tenant/[tenantId]/api/approvals
 * List moderation / approval queue items (admin).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const { searchParams } = new URL(request.url);
    const parsed = ListApprovalsQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json(await ApprovalQueueService.list(tenantId, parsed.data), { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * POST /tenant/[tenantId]/api/approvals
 * Submit an entity to the approval queue (admin). Idempotent per open entity.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json()) as Record<string, unknown>;
    // Default the submitter to the caller when not supplied.
    const parsed = SubmitApprovalDTO.safeParse({ submittedByUserId: user.userId, ...body });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ item: await ApprovalQueueService.submit(tenantId, parsed.data) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
