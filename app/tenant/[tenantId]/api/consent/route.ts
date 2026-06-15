import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { TermsConsentService, RecordConsentDTO, RecordManyDTO } from '@/modules/terms_consent';

/**
 * POST /tenant/[tenantId]/api/consent
 * PUBLIC — records a visitor's consent. Anonymous visitors may consent (no auth),
 * so this is rate-limited only. Accepts either a single decision (RecordConsentDTO)
 * or a banner submission with `decisions[]` (RecordManyDTO).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const meta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
      source: 'banner' as const,
    };

    if (Array.isArray(body.decisions)) {
      const parsed = RecordManyDTO.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
      }
      const records = await TermsConsentService.recordMany(
        tenantId,
        parsed.data.decisions,
        { userId: parsed.data.userId, anonymousId: parsed.data.anonymousId },
        meta,
        parsed.data.policyVersion,
      );
      return NextResponse.json({ records }, { status: 201 });
    }

    const parsed = RecordConsentDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const record = await TermsConsentService.record(tenantId, parsed.data, meta);
    return NextResponse.json({ record }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * GET /tenant/[tenantId]/api/consent?userId=…|anonymousId=…
 * PUBLIC — returns the current consent state (latest decision per purpose) for a subject.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? undefined;
    const anonymousId = searchParams.get('anonymousId') ?? undefined;
    if (!userId && !anonymousId) {
      return NextResponse.json({ message: 'userId or anonymousId is required' }, { status: 400 });
    }
    const state = await TermsConsentService.getState(tenantId, { userId, anonymousId });
    return NextResponse.json({ state }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
