import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { MeteringService, CreateRunDTO, ListRunsQuery } from '@kuraykaraaslan/metering';

/**
 * GET /tenant/[tenantId]/api/metering/runs
 * List billing-run documents (admin). Same store as /billing — this is the
 * document-oriented surface for the runs detail page.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const parsed = ListRunsQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json(await MeteringService.listRuns(tenantId, parsed.data));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 });
  }
}

/**
 * POST /tenant/[tenantId]/api/metering/runs
 * Open a new billing-run document in DRAFT (admin).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  try {
    const parsed = CreateRunDTO.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ item: await MeteringService.createRun(tenantId, parsed.data) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 });
  }
}
