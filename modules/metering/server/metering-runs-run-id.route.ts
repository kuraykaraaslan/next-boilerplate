import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { MeteringService } from '@kuraykaraaslan/metering';

type Ctx = { params: Promise<{ tenantId: string; runId: string }> };

/**
 * GET /tenant/[tenantId]/api/metering/runs/[runId]
 * Fetch one billing-run document (admin).
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
    return NextResponse.json({ item: await MeteringService.getRun(tenantId, runId) });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 });
  }
}
