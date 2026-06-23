import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { MeteringService } from '@kuraykaraaslan/metering';

type Ctx = { params: Promise<{ tenantId: string; runId: string }> };

/**
 * GET /tenant/[tenantId]/api/metering/runs/[runId]/lines
 * Read-only usage-event lines for a run (admin). Usage is append-only, so this
 * child collection has no POST/PATCH/DELETE — the lines are immutable facts.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, runId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? '0') || 0;
    const pageSize = Number(searchParams.get('pageSize') ?? '200') || 200;
    return NextResponse.json(await MeteringService.listRunEvents(tenantId, runId, page, pageSize));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 });
  }
}
