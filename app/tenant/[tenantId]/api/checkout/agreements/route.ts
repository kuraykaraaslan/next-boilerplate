import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { AgreementService, RenderCheckoutDTO } from '@/modules/terms_consent';

/**
 * POST /tenant/[tenantId]/api/checkout/agreements
 * PUBLIC (rate-limited) — render the order-specific agreements (distance-selling,
 * pre-information, …) for display before payment. Guest checkout friendly.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = RenderCheckoutDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const agreements = await AgreementService.renderCheckoutAgreements(tenantId, parsed.data.order, parsed.data.types);
    return NextResponse.json({ agreements }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
