import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import { AgreementService, AcceptCheckoutDTO } from '@nb/terms_consent';

/**
 * POST /tenant/[tenantId]/api/checkout/agreements/accept
 * Record acceptance of the order agreements before payment. PUBLIC (rate-limited)
 * for guest checkout; if a session exists the server-trusted userId is attached.
 * The server RE-renders authoritative text and stores order-specific docs verbatim.
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
      // Guest checkout — fall back to the body's anonymousId.
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = AcceptCheckoutDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const subject = {
      userId: sessionUserId ?? parsed.data.userId,
      anonymousId: parsed.data.anonymousId,
    };
    if (!subject.userId && !subject.anonymousId) {
      return NextResponse.json({ message: 'userId or anonymousId is required' }, { status: 400 });
    }
    const meta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
      source: 'checkout' as const,
    };
    const acceptances = await AgreementService.acceptCheckoutAgreements(
      tenantId,
      { order: parsed.data.order, types: parsed.data.types, subject },
      meta,
    );
    return NextResponse.json({ acceptances }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
