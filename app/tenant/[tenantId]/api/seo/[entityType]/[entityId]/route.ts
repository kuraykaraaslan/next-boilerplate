import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { SeoService, UpsertSeoDTO, SeoRouteParamsDTO } from '@nb/seo/server';

type Ctx = { params: Promise<{ tenantId: string; entityType: string; entityId: string }> };

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({
    request, tenantId, requiredTenantRole: 'ADMIN',
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, entityType, entityId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const parsed = SeoRouteParamsDTO.safeParse({ entityType, entityId });
    if (!parsed.success) return NextResponse.json({ message: 'Invalid entityType or entityId' }, { status: 400 });
    const seo = await SeoService.get(tenantId, entityType, entityId);
    return NextResponse.json({ seo });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, entityType, entityId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const parsed = SeoRouteParamsDTO.safeParse({ entityType, entityId });
    if (!parsed.success) return NextResponse.json({ message: 'Invalid entityType or entityId' }, { status: 400 });
    const dto = UpsertSeoDTO.parse(await request.json());
    const seo = await SeoService.upsert(tenantId, entityType, entityId, dto);
    return NextResponse.json({ seo });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}
