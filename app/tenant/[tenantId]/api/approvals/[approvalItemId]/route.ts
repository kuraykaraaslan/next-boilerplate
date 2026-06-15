import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { ApprovalQueueService, ApprovalActionDTO } from '@/modules/approval';

/**
 * GET /tenant/[tenantId]/api/approvals/[approvalItemId]
 * Fetch a single approval item (admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; approvalItemId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, approvalItemId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    return NextResponse.json({ item: await ApprovalQueueService.get(tenantId, approvalItemId) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * PATCH /tenant/[tenantId]/api/approvals/[approvalItemId]
 * Claim a pending item or record a decision (approve / reject / escalate) (admin).
 * Body: { action: 'claim' } | { action: 'decide', decision, note? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; approvalItemId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, approvalItemId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const parsed = ApprovalActionDTO.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    if (parsed.data.action === 'claim') {
      const item = await ApprovalQueueService.claim(tenantId, user.userId, approvalItemId);
      return NextResponse.json({ item }, { status: 200 });
    }

    const item = await ApprovalQueueService.decide(tenantId, user.userId, approvalItemId, {
      decision: parsed.data.decision!,
      note: parsed.data.note,
    });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
