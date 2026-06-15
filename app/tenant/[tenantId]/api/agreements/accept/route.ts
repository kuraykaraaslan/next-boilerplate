import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { AgreementService, AcceptAgreementDTO } from '@/modules/terms_consent';

/**
 * POST /tenant/[tenantId]/api/agreements/accept
 * Record acceptance of a reusable agreement's current version. PUBLIC (rate-limited)
 * so it works during signup before a session exists; the subject is the body's
 * userId or anonymousId.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = AcceptAgreementDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const meta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
      source: 'api' as const,
    };
    const acceptance = await AgreementService.accept(
      tenantId,
      {
        agreementId: parsed.data.agreementId,
        type: parsed.data.type,
        accepted: parsed.data.accepted,
        subject: { userId: parsed.data.userId, anonymousId: parsed.data.anonymousId },
      },
      meta,
    );
    return NextResponse.json({ acceptance }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
