import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import TenantCheckoutService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.checkout.service';
import { SUBSCRIPTION_MESSAGES } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.messages';
import { PaymentProviderEnum } from '@kuraykaraaslan/payment/server/payment.enums';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';

const ConfirmExpressCheckoutSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  provider: PaymentProviderEnum.optional(),
});

/**
 * POST /tenant/[tenantId]/api/subscription/payment-intent/confirm
 * Finalize an Express Checkout: verifies the PaymentIntent succeeded server-side,
 * then activates the subscription.
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

    const parsed = ConfirmExpressCheckoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    try {
      const subscription = await TenantCheckoutService.confirmExpressCheckout({
        tenantId,
        paymentId: parsed.data.paymentId,
        provider: parsed.data.provider,
      });
      return NextResponse.json({ success: true, subscription }, { status: 200 });
    } catch (confirmErr: any) {
      return NextResponse.json(
        { success: false, message: confirmErr.message || SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED },
        { status: 402 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED },
      { status: 500 },
    );
  }
}
