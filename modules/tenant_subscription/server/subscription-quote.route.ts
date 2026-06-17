import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import TenantCardCheckoutService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.card.service';
import { SUBSCRIPTION_MESSAGES } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.messages';
import { PaymentProviderEnum } from '@kuraykaraaslan/payment/server/payment.enums';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

const QuoteRequestSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  bin: z.string().regex(/^\d{6,8}$/, 'BIN must be 6–8 digits'),
  provider: PaymentProviderEnum.optional(),
});

/**
 * POST /tenant/[tenantId]/api/subscription/quote
 * Live checkout preview: the amount/currency a plan would be charged for a given
 * card BIN (TRY-converted for Turkish cards on iyzico). No payment is created.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const parsed = QuoteRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const quote = await TenantCardCheckoutService.quote(
      tenantId,
      parsed.data.planId,
      parsed.data.bin,
      parsed.data.provider ?? 'IYZICO',
    );
    return NextResponse.json({ success: true, ...quote }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 },
    );
  }
}
