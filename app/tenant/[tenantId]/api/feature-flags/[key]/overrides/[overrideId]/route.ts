import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { FeatureFlagsService } from '@/modules/feature_flags';

type Ctx = { params: Promise<{ tenantId: string; key: string; overrideId: string }> };

/** DELETE …/feature-flags/[key]/overrides/[overrideId] — remove an override (admin). */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, key, overrideId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
    await FeatureFlagsService.removeOverride(tenantId, key, overrideId, user.userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
