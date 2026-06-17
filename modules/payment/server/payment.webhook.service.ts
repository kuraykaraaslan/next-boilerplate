import 'reflect-metadata';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import Logger from '@kuraykaraaslan/logger';
import type { NormalizedEvent, PaypalVerifyPayload, PaypalWebhookHeaders } from './payment.webhook.types';
import PaymentWebhookHandlersService from './payment.webhook.handlers.service';
import PaymentWebhookStripeService from './payment.webhook.stripe.service';
import PaymentWebhookPaypalService from './payment.webhook.paypal.service';

export type { PaypalWebhookHeaders } from './payment.webhook.types';

/**
 * Entry point for inbound payment-provider webhooks. Iyzico callback handling
 * lives here; Stripe and PayPal verification/normalization are delegated to
 * `PaymentWebhookStripeService` / `PaymentWebhookPaypalService`, and the
 * normalized events are routed by `PaymentWebhookHandlersService`.
 */
export default class PaymentWebhookService {

  // ── Stripe (delegated) ─────────────────────────────────────────────────────
  static verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    return PaymentWebhookStripeService.verifyStripeSignature(rawBody, signatureHeader, secret);
  }

  static handleStripeEvent(rawBody: string, signatureHeader: string): Promise<void> {
    return PaymentWebhookStripeService.handleStripeEvent(rawBody, signatureHeader);
  }

  // ── PayPal (delegated) ─────────────────────────────────────────────────────
  static verifyPaypalSignature(payload: PaypalVerifyPayload): Promise<boolean> {
    return PaymentWebhookPaypalService.verifyPaypalSignature(payload);
  }

  static handlePaypalEvent(rawBody: string, headers: PaypalWebhookHeaders): Promise<void> {
    return PaymentWebhookPaypalService.handlePaypalEvent(rawBody, headers);
  }

  // ── Iyzico ─────────────────────────────────────────────────────────────────
  static async handleIyzicoCallback(token: string): Promise<void> {
    if (!token) throw new AppError(PAYMENT_MESSAGES.IYZICO_CALLBACK_TOKEN_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    const [apiKey, secretKey, sandbox] = await Promise.all([
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoApiKey'),
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoSecretKey'),
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoSandboxMode'),
    ]);
    if (!apiKey || !secretKey) throw new AppError(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);

    const baseUrl = sandbox === 'true'
      ? 'https://sandbox-api.iyzipay.com'
      : 'https://api.iyzipay.com';

    const path = '/payment/iyzipos/checkoutform/auth/ecom/detail';
    const randomKey = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const payload = JSON.stringify({ locale: 'tr', token });
    const signature = CryptoJS.HmacSHA256(randomKey + path + payload, secretKey).toString();
    const authStr = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
    const authorization = `IYZWSv2 ${CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authStr))}`;

    let response: Record<string, any>;
    try {
      const res = await axios.post<Record<string, any>>(`${baseUrl}${path}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authorization,
          'x-iyzi-rnd': randomKey,
        },
      });
      response = res.data;
    } catch (error) {
      Logger.error(`[Webhook:Iyzico] API error: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(PAYMENT_MESSAGES.IYZICO_CALLBACK_VERIFICATION_FAILED, 502, ErrorCode.INTERNAL_ERROR);
    }

    const isSuccess = response.paymentStatus === 'SUCCESS' || response.status === 'success';
    const normalized: NormalizedEvent = {
      action: isSuccess ? 'payment.completed' : 'payment.failed',
      providerPaymentId: token,
      failureCode: !isSuccess ? (response.errorCode as string | undefined) : undefined,
      failureMessage: !isSuccess ? (response.errorMessage as string | undefined) : undefined,
      rawEvent: response,
    };

    await PaymentWebhookHandlersService.dispatch(normalized, 'IYZICO');
  }
}
