import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import TenantCheckoutService from '@nb/tenant_subscription/server/tenant_subscription.checkout.service';
import { SUBSCRIPTION_MESSAGES } from '@nb/tenant_subscription/server/tenant_subscription.messages';
import { PaymentProviderEnum } from '@nb/payment/server/payment.enums';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';

const StartExpressCheckoutSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  provider: PaymentProviderEnum.optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
});

/**
 * POST /tenant/[tenantId]/api/subscription/payment-intent
 * Start an Express Checkout (Stripe wallets: Apple/Google Pay, Click to Pay, …).
 * Returns the client secret + publishable key for the front-end Element.
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

    const parsed = StartExpressCheckoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const result = await TenantCheckoutService.startExpressCheckout({
      tenantId,
      planId: parsed.data.planId,
      provider: parsed.data.provider,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED },
      { status: 500 },
    );
  }
}
