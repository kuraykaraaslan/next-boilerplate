// path: app/system/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PaymentWebhookService from '@/modules/payment/payment.webhook.service';
import { PAYMENT_MESSAGES } from '@/modules/payment/payment.messages';
import Logger from '@/libs/logger';

/**
 * POST /system/api/webhooks/stripe
 *
 * Stripe calls this endpoint after every payment event.
 * Raw body must be read before any JSON parsing — Stripe signature
 * verification requires the exact bytes sent by Stripe.
 *
 * Configure in Stripe Dashboard:
 *   Endpoint URL : https://<your-domain>/system/api/webhooks/stripe
 *   Events to send:
 *     - checkout.session.completed
 *     - checkout.session.expired
 *     - payment_intent.payment_failed
 *     - charge.refunded
 *     - invoice.payment_succeeded
 *     - invoice.payment_failed
 *     - customer.subscription.deleted
 *
 * Required setting key: stripeWebhookSecret (from Stripe Dashboard → Webhooks → Signing secret)
 */
export async function POST(request: NextRequest) {
  const signatureHeader = request.headers.get('stripe-signature');
  if (!signatureHeader) {
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_INVALID_SIGNATURE }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 400 });
  }

  try {
    await PaymentWebhookService.handleStripeEvent(rawBody, signatureHeader);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    const message = error?.message as string ?? '';

    if (
      message === PAYMENT_MESSAGES.STRIPE_WEBHOOK_VERIFICATION_FAILED ||
      message === PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED
    ) {
      Logger.warn(`[Route:Stripe Webhook] ${message}`);
      return NextResponse.json({ message }, { status: 400 });
    }

    Logger.error(`[Route:Stripe Webhook] ${message}`);
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 500 });
  }
}
