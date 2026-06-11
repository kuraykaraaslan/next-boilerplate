import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { getDataSource } from '@/modules/db';
import { Payment as PaymentEntity } from './entities/payment.entity';
import PaymentService from './payment.service';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import WebhookService from '@/modules/webhook/webhook.service';
import Logger from '@/modules/logger';
import type { NormalizedEvent } from './payment.webhook.types';

export default class PaymentWebhookPaymentService {

  static async findPaymentIdByProviderId(providerPaymentId: string): Promise<string | null> {
    try {
      const ds = await getDataSource();
      const payment = await ds.getRepository(PaymentEntity).findOne({
        where: { providerPaymentId, deletedAt: IsNull() }, select: ['paymentId'],
      });
      return payment?.paymentId ?? null;
    } catch {
      return null;
    }
  }

  static async onPaymentCompleted(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookPaymentService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) { Logger.warn(`[Webhook:${provider}] payment.completed — not found: ${event.providerPaymentId}`); return; }
    await TenantSubscriptionService.confirmPayment(paymentId);
    await AuditLogService.log({ tenantId: event.tenantId, actorType: 'SYSTEM', action: 'payment.webhook.completed',
      resourceType: 'Payment', resourceId: paymentId, metadata: { provider, providerPaymentId: event.providerPaymentId } });
    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.completed', {
        paymentId, provider, providerPaymentId: event.providerPaymentId, amount: event.amount ?? null, currency: event.currency ?? null,
      });
    }
    Logger.info(`[Webhook:${provider}] payment.completed → subscription activated: ${paymentId}`);
  }

  static async onPaymentFailed(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookPaymentService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) { Logger.warn(`[Webhook:${provider}] payment.failed — not found: ${event.providerPaymentId}`); return; }
    await PaymentService.markAsFailed(paymentId, event.failureCode, event.failureMessage);
    await AuditLogService.log({ tenantId: event.tenantId, actorType: 'SYSTEM', action: 'payment.webhook.failed',
      resourceType: 'Payment', resourceId: paymentId, metadata: { provider, failureCode: event.failureCode, failureMessage: event.failureMessage } });
    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.failed', {
        paymentId, provider, providerPaymentId: event.providerPaymentId, failureCode: event.failureCode ?? null, failureMessage: event.failureMessage ?? null,
      });
    }
    Logger.info(`[Webhook:${provider}] payment.failed → marked: ${paymentId}`);
  }

  static async onPaymentExpired(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookPaymentService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) { Logger.warn(`[Webhook:${provider}] payment.expired — not found: ${event.providerPaymentId}`); return; }
    await PaymentService.update(paymentId, { status: 'EXPIRED' });
    await AuditLogService.log({ tenantId: event.tenantId, actorType: 'SYSTEM', action: 'payment.webhook.expired',
      resourceType: 'Payment', resourceId: paymentId, metadata: { provider } });
    Logger.info(`[Webhook:${provider}] payment.expired → marked: ${paymentId}`);
  }

  static async onPaymentRefunded(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookPaymentService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) { Logger.warn(`[Webhook:${provider}] payment.refunded — not found: ${event.providerPaymentId}`); return; }
    if (event.amount) {
      await PaymentService.refund({ paymentId, amount: event.amount });
    } else {
      await PaymentService.update(paymentId, { status: 'REFUNDED' });
    }
    await AuditLogService.log({ tenantId: event.tenantId, actorType: 'SYSTEM', action: 'payment.webhook.refunded',
      resourceType: 'Payment', resourceId: paymentId, metadata: { provider, amount: event.amount } });
    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.refunded', {
        paymentId, provider, providerPaymentId: event.providerPaymentId, amount: event.amount ?? null, currency: event.currency ?? null,
      });
    }
    Logger.info(`[Webhook:${provider}] payment.refunded → recorded: ${paymentId}`);
  }
}
