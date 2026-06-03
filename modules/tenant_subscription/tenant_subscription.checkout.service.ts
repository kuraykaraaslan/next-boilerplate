import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import Logger from '@/modules/logger';
import PaymentService from '@/modules/payment/payment.service';
import { ExchangeRateService } from '@/modules/exchange_rate';
import type { PaymentProvider, PaymentCurrency } from '@/modules/payment/payment.enums';
import type { TenantSubscription } from './tenant_subscription.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { fetchProductOrThrow } from './tenant_subscription.helpers';
import TenantSubscriptionService from './tenant_subscription.service';

/**
 * Hosted checkout and Stripe Element express wallets (Apple/Google Pay, Click to
 * Pay) for tenant subscriptions. The raw-card / 3DS flow lives in
 * TenantCardCheckoutService; activation is delegated back to
 * {@link TenantSubscriptionService.confirmPayment}.
 */
export default class TenantCheckoutService {

  // ============================================================================
  // Hosted checkout (provider-redirect)
  // ============================================================================

  static async purchaseSubscription(params: {
    tenantId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
    /**
     * Convert the plan price to TRY (live TCMB rate) before charging. Used by the
     * iyzico hosted **wallet** path (MasterPass / BKM Express), since those are
     * Turkish wallets that settle in TRY.
     */
    convertToTry?: boolean;
  }): Promise<{ paymentId: string; checkoutUrl: string }> {
    const { tenantId, planId, successUrl, cancelUrl, provider, customerEmail, customerName, convertToTry } = params;

    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await fetchProductOrThrow(tenantId, plan.productId);

    const billingInterval = plan.interval;
    const baseAmount = Number(product.basePrice);
    const baseCurrency = product.currency;

    let amount = baseAmount;
    let currency = baseCurrency as PaymentCurrency;
    let exchangeRate: number | null = null;
    if (convertToTry && baseCurrency.toUpperCase() !== 'TRY') {
      exchangeRate = await ExchangeRateService.getRate(baseCurrency, 'TRY');
      amount = Math.round((baseAmount * exchangeRate + Number.EPSILON) * 100) / 100;
      currency = 'TRY' as PaymentCurrency;
    }

    try {
      const payment = await PaymentService.create({
        tenantId,
        provider: provider || 'STRIPE',
        amount,
        currency,
        description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
        customerEmail,
        customerName,
        metadata: {
          type: 'subscription', planId, billingInterval, tenantId,
          originalAmount: baseAmount,
          originalCurrency: baseCurrency,
          exchangeRate,
          chargedAmountTRY: currency === 'TRY' ? amount : undefined,
        },
      });

      const checkout = await PaymentService.createCheckoutSession(
        tenantId,
        {
          amount,
          currency,
          description: `${product.name} Subscription`,
          successUrl: `${successUrl}?paymentId=${payment.paymentId}`,
          cancelUrl,
          metadata: { paymentId: payment.paymentId, planId, tenantId, billingInterval },
        },
        provider
      );

      await PaymentService.update(payment.paymentId, {
        providerPaymentId: checkout.sessionId,
        metadata: { ...(payment.metadata as object || {}), checkoutSessionId: checkout.sessionId },
      });

      return { paymentId: payment.paymentId, checkoutUrl: checkout.checkoutUrl };
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED);
    }
  }

  // ============================================================================
  // Express Checkout (Stripe Element wallets: Apple/Google Pay, Click to Pay, …)
  // ============================================================================

  /**
   * Begin an Express Checkout: create a PENDING Payment + a provider PaymentIntent,
   * and return the client secret + publishable key for the front-end Element. The
   * front end confirms the intent (wallet UI), then calls
   * {@link confirmExpressCheckout} to activate the subscription.
   */
  static async startExpressCheckout(params: {
    tenantId: string;
    planId: string;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{ paymentId: string; clientSecret: string; publishableKey: string | null; amount: number; currency: string }> {
    const provider: PaymentProvider = params.provider ?? 'STRIPE';

    const sysDs = await tenantDataSourceFor(params.tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId: params.tenantId, planId: params.planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await fetchProductOrThrow(params.tenantId, plan.productId);

    const billingInterval = plan.interval;
    const amount = Number(product.basePrice);
    const currency = product.currency as PaymentCurrency;

    const payment = await PaymentService.create({
      tenantId: params.tenantId,
      provider,
      amount,
      currency,
      paymentMethod: 'CREDIT_CARD',
      description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      metadata: { type: 'subscription', planId: params.planId, billingInterval, tenantId: params.tenantId },
    });

    const intent = await PaymentService.createPaymentIntent(
      params.tenantId,
      { amount, currency, description: `${product.name} Subscription`, metadata: { paymentId: payment.paymentId } },
      provider,
    );

    await PaymentService.update(payment.paymentId, {
      providerPaymentId: intent.providerRef,
      metadata: { ...((payment.metadata as object) || {}), stripePaymentIntentId: intent.providerRef },
    });

    return { paymentId: payment.paymentId, clientSecret: intent.clientSecret, publishableKey: intent.publishableKey, amount, currency };
  }

  /**
   * Finalize an Express Checkout after the front-end confirms the wallet payment.
   * Verifies the PaymentIntent actually succeeded **server-side** (never trusts the
   * client) before activating the subscription (idempotent via `confirmPayment`).
   */
  static async confirmExpressCheckout(params: {
    tenantId: string;
    paymentId: string;
    provider?: PaymentProvider;
  }): Promise<TenantSubscription> {
    const provider: PaymentProvider = params.provider ?? 'STRIPE';
    const payment = await PaymentService.getById(params.paymentId);
    if (!payment) throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_NOT_FOUND);

    const ref = (payment.metadata as { stripePaymentIntentId?: string } | null)?.stripePaymentIntentId
      || payment.providerPaymentId;
    if (!ref) throw new Error(SUBSCRIPTION_MESSAGES.INVALID_REQUEST);

    const status = await PaymentService.getProviderStatus({ tenantId: params.tenantId, token: ref, provider });
    if (status !== 'succeeded') {
      throw new Error(SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED);
    }

    return TenantSubscriptionService.confirmPayment(params.paymentId);
  }
}
