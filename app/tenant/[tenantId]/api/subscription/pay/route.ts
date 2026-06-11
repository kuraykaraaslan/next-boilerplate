import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import TenantCardCheckoutService from '@/modules/tenant_subscription/tenant_subscription.card.service';
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages';
import { CreditCardInputSchema, PaymentProviderEnum } from '@/modules/payment/payment.enums';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';

const PayWithCardRequestSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  card: CreditCardInputSchema,
  provider: PaymentProviderEnum.optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
});

/**
 * POST /tenant/[tenantId]/api/subscription/pay
 * Pay for a subscription with a raw card via the custom (non-3DS) form. Charges
 * synchronously (TRY-converted for Turkish cards on iyzico) and activates the
 * subscription on success. Tenant admins only. The card is never persisted/logged.
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

    const parsed = PayWithCardRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined;
    const url = new URL(request.url);
    const callbackUrl = `${url.protocol}//${url.host}/tenant/${tenantId}/api/subscription/pay/3ds-callback`;

    try {
      const result = await TenantCardCheckoutService.payWithCard({
        tenantId,
        planId: parsed.data.planId,
        card: parsed.data.card,
        provider: parsed.data.provider,
        customerEmail: parsed.data.customerEmail,
        customerName: parsed.data.customerName,
        ip,
        callbackUrl,
      });

      if (result.status === 'requires_3ds') {
        // The browser renders htmlContent to take the user to the bank's 3DS page.
        return NextResponse.json({
          success: true,
          requires3ds: true,
          paymentId: result.paymentId,
          htmlContent: result.htmlContent,
          chargedAmount: result.chargedAmount,
          chargedCurrency: result.chargedCurrency,
          exchangeRate: result.exchangeRate,
        }, { status: 200 });
      }

      return NextResponse.json({ success: true, ...result }, { status: 200 });
    } catch (chargeErr: any) {
      // A declined/failed charge is a client-actionable outcome, not a server fault.
      return NextResponse.json(
        { success: false, message: chargeErr.message || SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED },
        { status: 402 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED },
      { status: 500 },
    );
  }
}
