import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { TenantSubscription as TenantSubscriptionEntity } from '../tenant_subscription/entities/tenant_subscription.entity';
import PaymentService from './payment.service';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import WebhookService from '@/modules/webhook/webhook.service';
import Logger from '@/modules/logger';
import type { NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookNotificationsService from './payment.webhook.notifications.service';

/**
 * Routes a normalized payment-webhook event to the matching action handler and
 * applies the domain side effects (confirm/fail/expire/refund payments,
 * cancel/past-due/renew subscriptions). Provider parsers (`*.stripe`, `*.paypal`,
 * Iyzico in `PaymentWebhookService`) call {@link dispatch}.
 */
export default class PaymentWebhookHandlersService {

  static async dispatch(event: NormalizedEvent, provider: string): Promise<void> {
    Logger.info(`[Webhook:${provider}] action=${event.action} providerPaymentId=${event.providerPaymentId}`);

    try {
      switch (event.action) {
        case 'payment.completed':   await PaymentWebhookHandlersService.onPaymentCompleted(event, provider); break;
        case 'payment.failed':      await PaymentWebhookHandlersService.onPaymentFailed(event, provider); break;
        case 'payment.expired':     await PaymentWebhookHandlersService.onPaymentExpired(event, provider); break;
        case 'payment.refunded':    await PaymentWebhookHandlersService.onPaymentRefunded(event, provider); break;
        case 'subscription.cancelled':  await PaymentWebhookHandlersService.onSubscriptionCancelled(event, provider); break;
        case 'subscription.past_due':   await PaymentWebhookHandlersService.onSubscriptionPastDue(event, provider); break;
        case 'subscription.renewed':    await PaymentWebhookHandlersService.onSubscriptionRenewed(event, provider); break;
      }
    } catch (error) {
      Logger.error(`[Webhook:${provider}] action=${event.action} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private static async findPaymentIdByProviderId(providerPaymentId: string): Promise<string | null> {
    try {
      const ds = await getDataSource();
      const payment = await ds.getRepository(PaymentEntity).findOne({
        where: { providerPaymentId, deletedAt: IsNull() },
        select: ['paymentId'],
      });
      return payment?.paymentId ?? null;
    } catch {
      return null;
    }
  }

  private static async onPaymentCompleted(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookHandlersService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) {
      Logger.warn(`[Webhook:${provider}] payment.completed — not found: ${event.providerPaymentId}`);
      return;
    }

    await TenantSubscriptionService.confirmPayment(paymentId);
    await AuditLogService.log({
      tenantId: event.tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.completed',
      resourceType: 'Payment',
      resourceId: paymentId,
      metadata: { provider, providerPaymentId: event.providerPaymentId },
    });

    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.completed', {
        paymentId,
        provider,
        providerPaymentId: event.providerPaymentId,
        amount: event.amount ?? null,
        currency: event.currency ?? null,
      });
    }

    Logger.info(`[Webhook:${provider}] payment.completed → subscription activated: ${paymentId}`);
  }

  private static async onPaymentFailed(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookHandlersService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) {
      Logger.warn(`[Webhook:${provider}] payment.failed — not found: ${event.providerPaymentId}`);
      return;
    }

    await PaymentService.markAsFailed(paymentId, event.failureCode, event.failureMessage);
    await AuditLogService.log({
      tenantId: event.tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.failed',
      resourceType: 'Payment',
      resourceId: paymentId,
      metadata: { provider, failureCode: event.failureCode, failureMessage: event.failureMessage },
    });

    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.failed', {
        paymentId,
        provider,
        providerPaymentId: event.providerPaymentId,
        failureCode: event.failureCode ?? null,
        failureMessage: event.failureMessage ?? null,
      });
    }

    Logger.info(`[Webhook:${provider}] payment.failed → marked: ${paymentId}`);
  }

  private static async onPaymentExpired(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookHandlersService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) {
      Logger.warn(`[Webhook:${provider}] payment.expired — not found: ${event.providerPaymentId}`);
      return;
    }

    await PaymentService.update(paymentId, { status: 'EXPIRED' });
    await AuditLogService.log({
      tenantId: event.tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.expired',
      resourceType: 'Payment',
      resourceId: paymentId,
      metadata: { provider },
    });

    Logger.info(`[Webhook:${provider}] payment.expired → marked: ${paymentId}`);
  }

  private static async onPaymentRefunded(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookHandlersService.findPaymentIdByProviderId(event.providerPaymentId);
    if (!paymentId) {
      Logger.warn(`[Webhook:${provider}] payment.refunded — not found: ${event.providerPaymentId}`);
      return;
    }

    if (event.amount) {
      await PaymentService.refund({ paymentId, amount: event.amount });
    } else {
      await PaymentService.update(paymentId, { status: 'REFUNDED' });
    }

    await AuditLogService.log({
      tenantId: event.tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.refunded',
      resourceType: 'Payment',
      resourceId: paymentId,
      metadata: { provider, amount: event.amount },
    });

    if (event.tenantId) {
      await WebhookService.dispatchEvent(event.tenantId, 'payment.refunded', {
        paymentId,
        provider,
        providerPaymentId: event.providerPaymentId,
        amount: event.amount ?? null,
        currency: event.currency ?? null,
      });
    }

    Logger.info(`[Webhook:${provider}] payment.refunded → recorded: ${paymentId}`);
  }

  private static async onSubscriptionCancelled(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) {
      Logger.warn(`[Webhook:${provider}] subscription.cancelled — no tenantId`);
      return;
    }

    await TenantSubscriptionService.cancelSubscription(tenantId);
    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.subscription.cancelled',
      resourceType: 'TenantSubscription',
      resourceId: tenantId,
      metadata: { provider, providerPaymentId: event.providerPaymentId },
    });

    Logger.info(`[Webhook:${provider}] subscription.cancelled for tenant: ${tenantId}`);
  }

  private static async onSubscriptionPastDue(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) {
      Logger.warn(`[Webhook:${provider}] subscription.past_due — no tenantId`);
      return;
    }

    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(TenantSubscriptionEntity).update({ tenantId }, { status: 'PAST_DUE' } as any);
    await TenantFeatureGateService.invalidateFeatureCache(tenantId);

    try {
      await TenantSubscriptionService.startGracePeriod(tenantId);
    } catch (err) {
      Logger.warn(`[Webhook:${provider}] Grace period start failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Dunning email — to every active ADMIN of the tenant so somebody acts.
    try {
      await PaymentWebhookNotificationsService.sendDunningEmail(tenantId, provider, event);
    } catch (err) {
      Logger.warn(`[Webhook:${provider}] Dunning email failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.subscription.past_due',
      resourceType: 'TenantSubscription',
      resourceId: tenantId,
      metadata: { provider, providerPaymentId: event.providerPaymentId },
    });

    Logger.info(`[Webhook:${provider}] subscription.past_due + grace period started for tenant: ${tenantId}`);
  }

  private static async onSubscriptionRenewed(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) {
      Logger.warn(`[Webhook:${provider}] subscription.renewed — no tenantId`);
      return;
    }

    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });

    if (sub) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (sub.billingInterval === 'MONTHLY') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      await ds.getRepository(TenantSubscriptionEntity).update(
        { tenantId },
        { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd } as any,
      );
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
    }

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'payment.webhook.subscription.renewed',
      resourceType: 'TenantSubscription',
      resourceId: tenantId,
      metadata: { provider, providerPaymentId: event.providerPaymentId, amount: event.amount },
    });

    // Issue an invoice for this renewal — best-effort. Failures must not
    // block the subscription extension; admin can re-issue from the UI.
    await PaymentWebhookNotificationsService.issueRenewalInvoice(event, provider).catch((err) => {
      Logger.warn(`[Webhook:${provider}] renewal invoice failed for ${tenantId}: ${err instanceof Error ? err.message : err}`);
    });

    Logger.info(`[Webhook:${provider}] subscription.renewed for tenant: ${tenantId}`);
  }
}
