import 'reflect-metadata';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { IsNull } from 'typeorm';
import { PAYMENT_MESSAGES } from './payment.messages';
import PaymentService from './payment.service';
import SettingService from '@/modules/setting/setting.service';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { TenantSubscription as TenantSubscriptionEntity } from '../tenant_subscription/entities/tenant_subscription.entity';
import { Tenant as TenantEntity } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import MailService from '@/modules/notification_mail/notification_mail.service';
import { env } from '@/modules/env';

// ============================================================================
// Types
// ============================================================================

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
  created: number;
}

interface PaypalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: Record<string, any>;
  create_time: string;
}

interface PaypalVerifyPayload {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: PaypalWebhookEvent;
}

type InternalWebhookAction =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.refunded'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.past_due';

interface NormalizedEvent {
  action: InternalWebhookAction;
  providerPaymentId: string;
  tenantId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string | undefined>;
  failureCode?: string;
  failureMessage?: string;
  rawEvent: unknown;
}

export interface PaypalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
}

// ============================================================================
// PaymentWebhookService
// ============================================================================

export default class PaymentWebhookService {

  // ──────────────────────────────────────────────────────────────────────────
  // Stripe
  // ──────────────────────────────────────────────────────────────────────────

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
    if (!secret) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED);

    if (!PaymentWebhookService.verifyStripeSignature(rawBody, signatureHeader, secret)) {
      Logger.warn('[Webhook:Stripe] Invalid signature');
      throw new Error(PAYMENT_MESSAGES.STRIPE_WEBHOOK_VERIFICATION_FAILED);
    }

    let event: StripeWebhookEvent;
    try {
      event = JSON.parse(rawBody) as StripeWebhookEvent;
    } catch {
      throw new Error(PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED);
    }

    const normalized = PaymentWebhookService.normalizeStripeEvent(event);
    if (!normalized) {
      Logger.info(`[Webhook:Stripe] Unhandled event type: ${event.type}`);
      return;
    }

    await PaymentWebhookService.dispatch(normalized, 'STRIPE');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PayPal
  // ──────────────────────────────────────────────────────────────────────────

  static async verifyPaypalSignature(payload: PaypalVerifyPayload): Promise<boolean> {
    const clientId = await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientId');
    const clientSecret = await SettingService.getValue(ROOT_TENANT_ID, 'paypalClientSecret');
    const sandbox = await SettingService.getValue(ROOT_TENANT_ID, 'paypalSandboxMode');
    if (!clientId || !clientSecret) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED);

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
    if (!webhookId) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED);

    let event: PaypalWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PaypalWebhookEvent;
    } catch {
      throw new Error(PAYMENT_MESSAGES.WEBHOOK_PROCESSING_FAILED);
    }

    const isValid = await PaymentWebhookService.verifyPaypalSignature({
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
      throw new Error(PAYMENT_MESSAGES.PAYPAL_WEBHOOK_VERIFICATION_FAILED);
    }

    const normalized = PaymentWebhookService.normalizePaypalEvent(event);
    if (!normalized) {
      Logger.info(`[Webhook:PayPal] Unhandled event type: ${event.event_type}`);
      return;
    }

    await PaymentWebhookService.dispatch(normalized, 'PAYPAL');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Iyzico
  // ──────────────────────────────────────────────────────────────────────────

  static async handleIyzicoCallback(token: string): Promise<void> {
    if (!token) throw new Error(PAYMENT_MESSAGES.IYZICO_CALLBACK_TOKEN_MISSING);

    const [apiKey, secretKey, sandbox] = await Promise.all([
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoApiKey'),
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoSecretKey'),
      SettingService.getValue(ROOT_TENANT_ID, 'iyzicoSandboxMode'),
    ]);
    if (!apiKey || !secretKey) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED);

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
      throw new Error(PAYMENT_MESSAGES.IYZICO_CALLBACK_VERIFICATION_FAILED);
    }

    const isSuccess = response.paymentStatus === 'SUCCESS' || response.status === 'success';
    const normalized: NormalizedEvent = {
      action: isSuccess ? 'payment.completed' : 'payment.failed',
      providerPaymentId: token,
      failureCode: !isSuccess ? (response.errorCode as string | undefined) : undefined,
      failureMessage: !isSuccess ? (response.errorMessage as string | undefined) : undefined,
      rawEvent: response,
    };

    await PaymentWebhookService.dispatch(normalized, 'IYZICO');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Dispatcher
  // ──────────────────────────────────────────────────────────────────────────

  private static async dispatch(event: NormalizedEvent, provider: string): Promise<void> {
    Logger.info(`[Webhook:${provider}] action=${event.action} providerPaymentId=${event.providerPaymentId}`);

    try {
      switch (event.action) {
        case 'payment.completed':   await PaymentWebhookService.onPaymentCompleted(event, provider); break;
        case 'payment.failed':      await PaymentWebhookService.onPaymentFailed(event, provider); break;
        case 'payment.expired':     await PaymentWebhookService.onPaymentExpired(event, provider); break;
        case 'payment.refunded':    await PaymentWebhookService.onPaymentRefunded(event, provider); break;
        case 'subscription.cancelled':  await PaymentWebhookService.onSubscriptionCancelled(event, provider); break;
        case 'subscription.past_due':   await PaymentWebhookService.onSubscriptionPastDue(event, provider); break;
        case 'subscription.renewed':    await PaymentWebhookService.onSubscriptionRenewed(event, provider); break;
      }
    } catch (error) {
      Logger.error(`[Webhook:${provider}] action=${event.action} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // Action handlers
  // ──────────────────────────────────────────────────────────────────────────

  private static async onPaymentCompleted(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookService.findPaymentIdByProviderId(event.providerPaymentId);
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

    Logger.info(`[Webhook:${provider}] payment.completed → subscription activated: ${paymentId}`);
  }

  private static async onPaymentFailed(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookService.findPaymentIdByProviderId(event.providerPaymentId);
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

    Logger.info(`[Webhook:${provider}] payment.failed → marked: ${paymentId}`);
  }

  private static async onPaymentExpired(event: NormalizedEvent, provider: string): Promise<void> {
    const paymentId = await PaymentWebhookService.findPaymentIdByProviderId(event.providerPaymentId);
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
    const paymentId = await PaymentWebhookService.findPaymentIdByProviderId(event.providerPaymentId);
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
    await TenantSubscriptionService.invalidateFeatureCache(tenantId);

    try {
      await TenantSubscriptionService.startGracePeriod(tenantId);
    } catch (err) {
      Logger.warn(`[Webhook:${provider}] Grace period start failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Dunning email — to every active ADMIN of the tenant so somebody acts.
    try {
      await PaymentWebhookService.sendDunningEmail(tenantId, provider, event);
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
      await TenantSubscriptionService.invalidateFeatureCache(tenantId);
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
    await PaymentWebhookService.issueRenewalInvoice(event, provider).catch((err) => {
      Logger.warn(`[Webhook:${provider}] renewal invoice failed for ${tenantId}: ${err instanceof Error ? err.message : err}`);
    });

    Logger.info(`[Webhook:${provider}] subscription.renewed for tenant: ${tenantId}`);
  }

  /**
   * Create + issue + mark-paid a legally-formatted Invoice for a renewal.
   * Region/tax/adapter selection is driven by the tenant's `billingRegion`
   * setting; see modules/invoice/README.md.
   */
  private static async issueRenewalInvoice(event: NormalizedEvent, provider: string): Promise<void> {
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

  /**
   * Fan out a dunning notification to every active tenant ADMIN.
   * Provider-agnostic — Stripe `invoice.payment_failed` is the loudest
   * trigger but PayPal / Iyzico can hit the same path via the normalised
   * `subscription.past_due` action.
   */
  private static async sendDunningEmail(tenantId: string, provider: string, event: NormalizedEvent): Promise<void> {
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

      await MailService.sendInvoicePaymentFailedEmail({
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
