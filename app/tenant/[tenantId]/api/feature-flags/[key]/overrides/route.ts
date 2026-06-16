import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { FeatureFlagsService, SetOverrideDTO } from '@nb/feature_flags';

type Ctx = { params: Promise<{ tenantId: string; key: string }> };

/** GET …/feature-flags/[key]/overrides — list overrides for a flag (admin). */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, key } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    return NextResponse.json({ data: await FeatureFlagsService.listOverrides(tenantId, key) }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/** POST …/feature-flags/[key]/overrides — upsert a per-subject override (admin). */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, key } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = SetOverrideDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ override: await FeatureFlagsService.setOverride(tenantId, key, parsed.data, user.userId) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
