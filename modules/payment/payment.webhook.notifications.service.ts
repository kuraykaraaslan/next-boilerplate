import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { TenantSubscription as TenantSubscriptionEntity } from '../tenant_subscription/entities/tenant_subscription.entity';
import { Tenant as TenantEntity } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import MailTemplatesService from '@/modules/notification_mail/notification_mail.templates.service';
import Logger from '@/modules/logger';
import { env } from '@/modules/env';
import type { NormalizedEvent } from './payment.webhook.types';

/**
 * Side-effect notifications triggered by subscription webhook actions: issuing a
 * renewal invoice and fanning out dunning email to a tenant's admins. Called by
 * `PaymentWebhookHandlersService`.
 */
export default class PaymentWebhookNotificationsService {

  static async issueRenewalInvoice(event: NormalizedEvent, provider: string): Promise<void> {
    const { tenantId } = event;
    if (!tenantId || !event.amount) return;

    // Lazy-import to avoid a circular dep through TenantSubscriptionService.
    const { default: InvoiceService } = await import('@/modules/invoice/invoice.service');
    const { default: SettingService } = await import('@/modules/setting/setting.service');

    // Caller info — best-effort. If the tenant hasn't populated company info
    // yet, InvoiceService.create will throw COMPANY_INFO_MISSING; we swallow.
    const settings = await SettingService.getByKeys(tenantId, ['invoiceDefaultCurrency']);
    const currency = (event.currency ?? settings.invoiceDefaultCurrency ?? 'USD').toUpperCase();

    // We don't have the end-customer email from the webhook payload in the
    // normalised shape — use the subscription/billing email if attached, or
    // fall back to a placeholder that the operator must override before
    // sending. Real implementations should attach customer info in
    // `event.metadata.customer{Email,Name,CountryCode}`.
    const md = (event.metadata ?? {}) as Record<string, string | undefined>;
    const customerEmail = md.customerEmail ?? 'unknown@example.com';
    const customerName = md.customerName ?? 'Customer';
    const customerCountryCode = (md.customerCountryCode ?? 'TR').toUpperCase().slice(0, 2);

    const planName = md.planName ?? 'Subscription renewal';
    const invoice = await InvoiceService.create(tenantId, {
      customerEmail,
      customerName,
      customerCountryCode,
      currency,
      lines: [{
        description: planName,
        quantity: 1,
        unitPrice: Number(event.amount),
        taxRate: 0, // defaults to invoiceDefaultVatRate inside service
        sourceType: 'subscription',
        sourceId: md.subscriptionId,
      }],
      paymentId: md.paymentId,
      subscriptionId: md.subscriptionId,
      metadata: { provider, providerPaymentId: event.providerPaymentId },
    });

    await InvoiceService.issue(tenantId, invoice.invoiceId);
    await InvoiceService.markPaid(tenantId, invoice.invoiceId, md.paymentId);
  }

  static async sendDunningEmail(tenantId: string, provider: string, event: NormalizedEvent): Promise<void> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const sub = await tenantDs.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });
    const members = await tenantDs.getRepository(TenantMemberEntity).find({
      where: { tenantId, memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
    });
    if (members.length === 0) {
      Logger.warn(`[Webhook:${provider}] no active ADMIN for tenant ${tenantId} — dunning mail skipped`);
      return;
    }

    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const tenantRepo = tenantDs.getRepository(TenantEntity);
    const tenant = await tenantRepo.findOne({ where: { tenantId } });

    const appHost = env.APPLICATION_HOST ?? 'http://localhost:3000';
    const billingPortalUrl = `${appHost}/tenant/${tenantId}/admin/subscription`;

    for (const member of members) {
      const user = await userRepo.findOne({ where: { userId: member.userId } });
      if (!user?.email) continue;

      const invoiceShape = {
        invoiceNumber: event.providerPaymentId ?? '—',
        totalAmount: event.amount ?? '—',
        currency: 'USD',
        customerName: tenant?.name ?? user.email,
      };

      await MailTemplatesService.sendInvoicePaymentFailedEmail({
        tenantId,
        email: user.email,
        invoice: invoiceShape,
        reason: event.failureMessage ?? event.failureCode ?? `Payment via ${provider} could not be processed`,
        retryAt: sub?.gracePeriodEndsAt ?? undefined,
        billingPortalUrl,
      });
    }

    Logger.info(`[Webhook:${provider}] dunning mail sent to ${members.length} admin(s) of tenant ${tenantId}`);
  }
}
