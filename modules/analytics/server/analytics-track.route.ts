import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { AnalyticsService, TrackEventDTO } from '@nb/analytics';

/**
 * POST /tenant/[tenantId]/api/analytics/track
 * Track a product event. Soft auth: if the caller has a session we attach the
 * server-trusted userId; anonymous visitors track with their anonymousId. Always
 * rate-limited.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    let sessionUserId: string | undefined;
    try {
      const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });
      sessionUserId = user.userId;
    } catch {
      // Anonymous visitor — proceed with the body's anonymousId only.
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = TrackEventDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const eventId = await AnalyticsService.track(tenantId, {
      ...parsed.data,
      userId: sessionUserId ?? parsed.data.userId,
    });
    return NextResponse.json({ eventId }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
