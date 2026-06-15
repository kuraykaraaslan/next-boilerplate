import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import { AnalyticsService, AnalyticsQueryDTO } from '@/modules/analytics';

/**
 * GET /tenant/[tenantId]/api/analytics/summary?from=&to=
 * ADMIN — top-line aggregate (total events, unique users/sessions, top events).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const { searchParams } = new URL(request.url);
    const parsed = AnalyticsQueryDTO.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json(await AnalyticsService.summary(tenantId, parsed.data), { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
