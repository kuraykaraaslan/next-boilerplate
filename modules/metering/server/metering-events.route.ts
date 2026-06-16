import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { MeteringService, RecordUsageDTO } from '@nb/metering';

/**
 * POST /tenant/[tenantId]/api/metering/events
 * Record a usage event (any authenticated tenant user — usage is recorded by
 * application code on behalf of the acting user). When the body omits a
 * subject, USER subject defaults to the authenticated user.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId });

    const body = (await request.json()) as Record<string, unknown>;
    // Default a USER-subject event to the caller when no subjectId supplied.
    if (body.subjectType === 'USER' && !body.subjectId) {
      body.subjectId = user.userId;
    }
    const parsed = RecordUsageDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ event: await MeteringService.recordEvent(tenantId, parsed.data) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
