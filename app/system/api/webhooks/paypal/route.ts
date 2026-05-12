// path: app/system/api/webhooks/paypal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PaymentWebhookService from '@/modules/payment/payment.webhook.service';
import { PAYMENT_MESSAGES } from '@/modules/payment/payment.messages';
import Logger from '@/modules/logger';

/**
 * POST /system/api/webhooks/paypal
 *
 * PayPal calls this endpoint for all subscribed payment events.
 * Verification is done via PayPal's verify-webhook-signature API
 * using the headers PayPal attaches to every request.
 *
 * Configure in PayPal Developer Dashboard → Webhooks:
 *   Endpoint URL : https://<your-domain>/system/api/webhooks/paypal
 *   Events to subscribe:
 *     - PAYMENT.CAPTURE.COMPLETED
 *     - PAYMENT.CAPTURE.DENIED
 *     - PAYMENT.CAPTURE.REFUNDED
 *     - CHECKOUT.ORDER.COMPLETED
 *     - BILLING.SUBSCRIPTION.CANCELLED
 *     - BILLING.SUBSCRIPTION.PAYMENT.FAILED
 *
 * Required setting keys:
 *   paypalClientId, paypalClientSecret  — for access token
 *   paypalWebhookId                     — from PayPal Dashboard → Webhooks → Webhook ID
 */
export async function POST(request: NextRequest) {
  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const transmissionSig = request.headers.get('paypal-transmission-sig');
  const certUrl = request.headers.get('paypal-cert-url');
  const authAlgo = request.headers.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_INVALID_SIGNATURE }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 400 });
  }

  try {
    await PaymentWebhookService.handlePaypalEvent(rawBody, {
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl,
      authAlgo,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    const message = error?.message as string ?? '';

    if (
      message === PAYMENT_MESSAGES.PAYPAL_WEBHOOK_VERIFICATION_FAILED ||
      message === PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED
    ) {
      Logger.warn(`[Route:PayPal Webhook] ${message}`);
      return NextResponse.json({ message }, { status: 400 });
    }

    Logger.error(`[Route:PayPal Webhook] ${message}`);
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 500 });
  }
}
