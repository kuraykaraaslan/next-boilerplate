import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantSubscription as TenantSubscriptionEntity } from '../tenant_subscription/entities/tenant_subscription.entity';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import type { NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookNotificationsService from './payment.webhook.notifications.service';

export default class PaymentWebhookSubscriptionService {

  static async onSubscriptionCancelled(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) { Logger.warn(`[Webhook:${provider}] subscription.cancelled — no tenantId`); return; }
    await TenantSubscriptionService.cancelSubscription(tenantId);
    await AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: 'payment.webhook.subscription.cancelled',
      resourceType: 'TenantSubscription', resourceId: tenantId, metadata: { provider, providerPaymentId: event.providerPaymentId } });
    Logger.info(`[Webhook:${provider}] subscription.cancelled for tenant: ${tenantId}`);
  }

  static async onSubscriptionPastDue(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) { Logger.warn(`[Webhook:${provider}] subscription.past_due — no tenantId`); return; }
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(TenantSubscriptionEntity).update({ tenantId }, { status: 'PAST_DUE' } as any);
    await TenantFeatureGateService.invalidateFeatureCache(tenantId);
    try {
      await TenantSubscriptionService.startGracePeriod(tenantId);
    } catch (err) {
      Logger.warn(`[Webhook:${provider}] Grace period start failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await PaymentWebhookNotificationsService.sendDunningEmail(tenantId, provider, event);
    } catch (err) {
      Logger.warn(`[Webhook:${provider}] Dunning email failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: 'payment.webhook.subscription.past_due',
      resourceType: 'TenantSubscription', resourceId: tenantId, metadata: { provider, providerPaymentId: event.providerPaymentId } });
    Logger.info(`[Webhook:${provider}] subscription.past_due + grace period started for tenant: ${tenantId}`);
  }

  static async onSubscriptionRenewed(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId) { Logger.warn(`[Webhook:${provider}] subscription.renewed — no tenantId`); return; }
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
      await ds.getRepository(TenantSubscriptionEntity).update({ tenantId }, { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd } as any);
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
    }
    await AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: 'payment.webhook.subscription.renewed',
      resourceType: 'TenantSubscription', resourceId: tenantId, metadata: { provider, providerPaymentId: event.providerPaymentId, amount: event.amount } });
    await PaymentWebhookNotificationsService.issueRenewalInvoice(event, provider).catch((err) => {
      Logger.warn(`[Webhook:${provider}] renewal invoice failed for ${tenantId}: ${err instanceof Error ? err.message : err}`);
    });
    Logger.info(`[Webhook:${provider}] subscription.renewed for tenant: ${tenantId}`);
  }
}
