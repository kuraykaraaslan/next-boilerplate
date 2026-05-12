// path: app/system/api/webhooks/iyzico/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PaymentWebhookService from '@/modules/payment/payment.webhook.service';
import { PAYMENT_MESSAGES } from '@/modules/payment/payment.messages';
import Logger from '@/modules/logger';

/**
 * POST /system/api/webhooks/iyzico
 *
 * Iyzico uses a callback URL model (not a traditional HMAC webhook).
 * After a checkout form completes, Iyzico POSTs to this URL with a
 * `token` field in application/x-www-form-urlencoded body.
 *
 * The token is then verified by calling Iyzico's detail API, which
 * returns the actual payment status. No separate signing secret is
 * required — authenticity is proved by the API response.
 *
 * Configure in Iyzico Dashboard → Merchant Settings:
 *   Callback URL : https://<your-domain>/system/api/webhooks/iyzico
 *
 * Required setting keys: iyzicoApiKey, iyzicoSecretKey
 *
 * Note: Also set as the `callbackUrl` when creating a checkout form
 * via IyzicoProvider.createCheckoutSession().
 */
export async function POST(request: NextRequest) {
  let token: string | null = null;

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const text = await request.text();
      const params = new URLSearchParams(text);
      token = params.get('token');
    } catch {
      return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 400 });
    }
  } else {
    try {
      const body = await request.json() as Record<string, unknown>;
      token = (body.token as string) ?? null;
    } catch {
      return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 400 });
    }
  }

  if (!token) {
    return NextResponse.json({ message: PAYMENT_MESSAGES.IYZICO_CALLBACK_TOKEN_MISSING }, { status: 400 });
  }

  try {
    await PaymentWebhookService.handleIyzicoCallback(token);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    const message = error?.message as string ?? '';

    if (
      message === PAYMENT_MESSAGES.IYZICO_CALLBACK_TOKEN_MISSING ||
      message === PAYMENT_MESSAGES.IYZICO_CALLBACK_VERIFICATION_FAILED ||
      message === PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED
    ) {
      Logger.warn(`[Route:Iyzico Callback] ${message}`);
      return NextResponse.json({ message }, { status: 400 });
    }

    Logger.error(`[Route:Iyzico Callback] ${message}`);
    return NextResponse.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED }, { status: 500 });
  }
}
