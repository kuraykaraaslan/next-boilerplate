import 'reflect-metadata';
import crypto from 'crypto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import SettingService from '@nb/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import Logger from '@nb/logger';
import type { StripeWebhookEvent, NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookHandlersService from './payment.webhook.handlers.service';

/** Stripe webhook signature verification, event normalization, and entry point. */
export default class PaymentWebhookStripeService {

  static verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);
    if (!timestamp || !v1) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
    } catch {
      return false;
    }
  }

  private static normalizeStripeEvent(event: StripeWebhookEvent): NormalizedEvent | null {
    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed':
        return {
          action: 'payment.completed',
          providerPaymentId: obj.id as string,
          tenantId: obj.metadata?.tenantId as string | undefined,
          amount: obj.amount_total ? (obj.amount_total as number) / 100 : undefined,
          rawEvent: event,
        };

      case 'checkout.session.expired':
        return {
          action: 'payment.expired',
          providerPaymentId: obj.id as string,
          tenantId: obj.metadata?.tenantId as string | undefined,
          rawEvent: event,
        };

      case 'payment_intent.payment_failed':
        return {
          action: 'payment.failed',
          providerPaymentId: obj.id as string,
          failureCode: obj.last_payment_error?.code as string | undefined,
          failureMessage: obj.last_payment_error?.message as string | undefined,
          rawEvent: event,
        };

      case 'charge.refunded':
        return {
          action: 'payment.refunded',
          providerPaymentId: obj.payment_intent as string,
          amount: obj.amount_refunded ? (obj.amount_refunded as number) / 100 : undefined,
          rawEvent: event,
        };

      case 'invoice.payment_succeeded':
        return {
          action: 'subscription.renewed',
          providerPaymentId: obj.subscription as string,
          tenantId: obj.metadata?.tenantId as string | undefined,
          amount: obj.amount_paid ? (obj.amount_paid as number) / 100 : undefined,
          rawEvent: event,
        };

      case 'invoice.payment_failed':
        return {
          action: 'subscription.past_due',
          providerPaymentId: obj.subscription as string,
          tenantId: obj.metadata?.tenantId as string | undefined,
          rawEvent: event,
        };

      case 'customer.subscription.deleted':
        return {
          action: 'subscription.cancelled',
          providerPaymentId: obj.id as string,
          tenantId: obj.metadata?.tenantId as string | undefined,
          rawEvent: event,
        };

      default:
        return null;
    }
  }

  static async handleStripeEvent(rawBody: string, signatureHeader: string): Promise<void> {
    const secret = await SettingService.getValue(ROOT_TENANT_ID, 'stripeWebhookSecret');
    if (!secret) throw new AppError(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);

    if (!PaymentWebhookStripeService.verifyStripeSignature(rawBody, signatureHeader, secret)) {
      Logger.warn('[Webhook:Stripe] Invalid signature');
      throw new AppError(PAYMENT_MESSAGES.STRIPE_WEBHOOK_VERIFICATION_FAILED, 400, ErrorCode.VALIDATION_ERROR);
    }

    let event: StripeWebhookEvent;
    try {
      event = JSON.parse(rawBody) as StripeWebhookEvent;
    } catch {
      throw new AppError(PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED, 400, ErrorCode.VALIDATION_ERROR);
    }

    const normalized = PaymentWebhookStripeService.normalizeStripeEvent(event);
    if (!normalized) {
      Logger.info(`[Webhook:Stripe] Unhandled event type: ${event.type}`);
      return;
    }

    await PaymentWebhookHandlersService.dispatch(normalized, 'STRIPE');
  }
}
