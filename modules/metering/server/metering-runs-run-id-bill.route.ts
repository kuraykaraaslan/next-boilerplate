import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { MeteringService, BillRunDTO } from '@kuraykaraaslan/metering';

type Ctx = { params: Promise<{ tenantId: string; runId: string }> };

/**
 * POST /tenant/[tenantId]/api/metering/runs/[runId]/bill
 * CALCULATED → BILLED — settle the calculated total on the two-rail model
 * (prepaid wallet credits first, remainder invoiced) (admin). The body may
 * carry customer / wallet details when a remainder must be invoiced.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, runId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = BillRunDTO.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ item: await MeteringService.billRun(tenantId, runId, parsed.data) });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 });
  }
}
