import 'reflect-metadata';
import axios from 'axios';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import Logger from '@kuraykaraaslan/logger';
import type { PaypalWebhookEvent, PaypalVerifyPayload, PaypalWebhookHeaders, NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookHandlersService from './payment.webhook.handlers.service';

/** PayPal webhook signature verification, event normalization, and entry point. */
export default class PaymentWebhookPaypalService {

  static async verifyPaypalSignature(payload: PaypalVerifyPayload): Promise<boolean> {
    const clientId = await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientId');
    const clientSecret = await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientSecret');
    const sandbox = await SettingService.getValue(ROOT_TENANT_ID, 'paypalSandboxMode');
    if (!clientId || !clientSecret) throw new AppError(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);

    const baseUrl = sandbox === 'true'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    try {
      const tokenRes = await axios.post<{ access_token: string }>(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const verifyRes = await axios.post<{ verification_status: string }>(
        `${baseUrl}/v1/notifications/verify-webhook-signature`,
        payload,
        { headers: { Authorization: `Bearer ${tokenRes.data.access_token}`, 'Content-Type': 'application/json' } },
      );

      return verifyRes.data.verification_status === 'SUCCESS';
    } catch (error) {
      Logger.error(`[Webhook:PayPal] Verify API error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private static normalizePaypalEvent(event: PaypalWebhookEvent): NormalizedEvent | null {
    const res = event.resource;

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return {
          action: 'payment.completed',
          providerPaymentId: (res.supplementary_data?.related_ids?.order_id || res.id) as string,
          tenantId: res.custom_id as string | undefined,
          amount: res.amount?.value ? Number(res.amount.value) : undefined,
          rawEvent: event,
        };

      case 'CHECKOUT.ORDER.COMPLETED':
        return {
          action: 'payment.completed',
          providerPaymentId: res.id as string,
          tenantId: res.purchase_units?.[0]?.custom_id as string | undefined,
          amount: res.purchase_units?.[0]?.amount?.value ? Number(res.purchase_units[0].amount.value) : undefined,
          rawEvent: event,
        };

      case 'PAYMENT.CAPTURE.DENIED':
        return {
          action: 'payment.failed',
          providerPaymentId: (res.supplementary_data?.related_ids?.order_id || res.id) as string,
          failureCode: res.status_details?.reason as string | undefined,
          failureMessage: res.status_details?.reason as string | undefined,
          rawEvent: event,
        };

      case 'PAYMENT.CAPTURE.REFUNDED':
        return {
          action: 'payment.refunded',
          providerPaymentId: (res.supplementary_data?.related_ids?.order_id || res.id) as string,
          amount: res.amount?.value ? Number(res.amount.value) : undefined,
          rawEvent: event,
        };

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        return {
          action: 'subscription.cancelled',
          providerPaymentId: res.id as string,
          tenantId: res.custom_id as string | undefined,
          rawEvent: event,
        };

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        return {
          action: 'subscription.past_due',
          providerPaymentId: res.id as string,
          tenantId: res.custom_id as string | undefined,
          rawEvent: event,
        };

      default:
        return null;
    }
  }

  static async handlePaypalEvent(rawBody: string, headers: PaypalWebhookHeaders): Promise<void> {
    const webhookId = await SettingService.getValue(ROOT_TENANT_ID, 'paypalWebhookId');
    if (!webhookId) throw new AppError(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);

    let event: PaypalWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PaypalWebhookEvent;
    } catch {
      throw new AppError(PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED, 400, ErrorCode.VALIDATION_ERROR);
    }

    const isValid = await PaymentWebhookPaypalService.verifyPaypalSignature({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    });

    if (!isValid) {
      Logger.warn('[Webhook:PayPal] Invalid signature');
      throw new AppError(PAYMENT_MESSAGES.PAYPAL_WEBHOOK_VERIFICATION_FAILED, 400, ErrorCode.VALIDATION_ERROR);
    }

    const normalized = PaymentWebhookPaypalService.normalizePaypalEvent(event);
    if (!normalized) {
      Logger.info(`[Webhook:PayPal] Unhandled event type: ${event.event_type}`);
      return;
    }

    await PaymentWebhookHandlersService.dispatch(normalized, 'PAYPAL');
  }
}
