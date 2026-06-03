import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { StoreProduct as ProductEntity } from '@/modules/store/entities/store_product.entity';
import PaymentService from '@/modules/payment/payment.service';
import { ExchangeRateService } from '@/modules/exchange_rate';
import type { PaymentProvider, PaymentCurrency, CreditCardInput } from '@/modules/payment/payment.enums';
import type { CardBinInfo } from '@/modules/payment/payment.types';
import type { TenantSubscription } from './tenant_subscription.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { fetchProductOrThrow } from './tenant_subscription.helpers';
import TenantSubscriptionService from './tenant_subscription.service';

/**
 * Direct card checkout for tenant subscriptions: the custom card form with
 * automatic TRY conversion for Turkish cards and auto-3DS. Hosted checkout and
 * Stripe Element wallets live in TenantCheckoutService; activation is delegated
 * back to {@link TenantSubscriptionService.confirmPayment}.
 */
export default class TenantCardCheckoutService {

  /** Providers that settle Turkish cards in TRY, so a TR card triggers conversion. */
  private static readonly TRY_SETTLE_PROVIDERS: ReadonlySet<PaymentProvider> = new Set<PaymentProvider>(['IYZICO']);

  /**
   * Work out what currency/amount a plan should actually be charged in for a
   * given card BIN + provider, without creating any payment. Shared by `quote`
   * (live checkout preview) and `payWithCard` (the real charge), so both stay in
   * lockstep. A plan priced in USD is converted to TRY at the live TCMB rate when
   * a TRY-settling provider (iyzico) is paid with a Turkish card.
   */
  private static async resolveCharge(
    tenantId: string,
    planId: string,
    bin: string | undefined,
    provider: PaymentProvider,
  ): Promise<{
    plan: SubscriptionPlanEntity;
    product: ProductEntity;
    baseAmount: number;
    baseCurrency: string;
    binInfo: CardBinInfo | null;
    isTurkish: boolean;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number | null;
  }> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await fetchProductOrThrow(tenantId, plan.productId);

    const baseAmount = Number(product.basePrice);
    const baseCurrency = product.currency;

    let binInfo: CardBinInfo | null = null;
    if (bin && bin.replace(/\D/g, '').length >= 6) {
      binInfo = await PaymentService.checkBin(tenantId, bin, provider);
    }

    const wantsTry =
      TenantCardCheckoutService.TRY_SETTLE_PROVIDERS.has(provider) &&
      !!binInfo?.isTurkish &&
      baseCurrency.toUpperCase() !== 'TRY';

    if (wantsTry) {
      const rate = await ExchangeRateService.getRate(baseCurrency, 'TRY');
      const chargedAmount = Math.round((baseAmount * rate + Number.EPSILON) * 100) / 100;
      return {
        plan, product, baseAmount, baseCurrency, binInfo,
        isTurkish: true, chargedAmount, chargedCurrency: 'TRY', exchangeRate: rate,
      };
    }

    return {
      plan, product, baseAmount, baseCurrency, binInfo,
      isTurkish: !!binInfo?.isTurkish,
      chargedAmount: baseAmount, chargedCurrency: baseCurrency, exchangeRate: null,
    };
  }

  /**
   * Live checkout preview for the card form: given a plan + card BIN, return the
   * amount/currency that would actually be charged (TRY-converted for TR cards on
   * iyzico) plus the detected card brand/bank. No payment is created.
   */
  static async quote(tenantId: string, planId: string, bin: string, provider: PaymentProvider = 'IYZICO'): Promise<{
    baseAmount: number;
    baseCurrency: string;
    isTurkish: boolean;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number | null;
    brand: string | null;
    bankName: string | null;
  }> {
    const r = await TenantCardCheckoutService.resolveCharge(tenantId, planId, bin, provider);
    return {
      baseAmount: r.baseAmount,
      baseCurrency: r.baseCurrency,
      isTurkish: r.isTurkish,
      chargedAmount: r.chargedAmount,
      chargedCurrency: r.chargedCurrency,
      exchangeRate: r.exchangeRate,
      brand: r.binInfo?.brand ?? null,
      bankName: r.binInfo?.bankName ?? null,
    };
  }

  /**
   * Pay for a subscription with a raw card via the custom card form. Detects the
   * card's BIN, converts the price to TRY when a Turkish card pays via a
   * TRY-settling provider, and charges.
   *
   * **3DS is decided automatically**: a commercial card (`force3ds`) or a Turkish
   * card goes through the 3D Secure flow (returns `requires_3ds` + the bank's HTML
   * to render); everything else is charged synchronously (`completed`). 3DS only
   * kicks in when a `callbackUrl` is supplied and the provider supports it.
   *
   * The original price + rate are persisted on the Payment metadata for
   * audit/invoicing; the Payment amount/currency hold the actual charge.
   */
  static async payWithCard(params: {
    tenantId: string;
    planId: string;
    card: CreditCardInput;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
    ip?: string;
    /** Where the bank returns after 3DS. When omitted, 3DS is skipped (non-3DS only). */
    callbackUrl?: string;
  }): Promise<
    | { status: 'completed'; paymentId: string; subscription: TenantSubscription; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
    | { status: 'requires_3ds'; paymentId: string; htmlContent: string; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
  > {
    const provider: PaymentProvider = params.provider ?? 'IYZICO';
    if (!PaymentService.supportsDirectCardPayment(provider)) {
      throw new Error(SUBSCRIPTION_MESSAGES.CARD_PROVIDER_UNSUPPORTED);
    }

    const bin = params.card.cardNumber.replace(/\D/g, '').slice(0, 8);
    const resolved = await TenantCardCheckoutService.resolveCharge(params.tenantId, params.planId, bin, provider);
    const { product, baseAmount, baseCurrency, chargedAmount, chargedCurrency, exchangeRate, binInfo } = resolved;
    const billingInterval = resolved.plan.interval;

    const payment = await PaymentService.create({
      tenantId: params.tenantId,
      provider,
      amount: chargedAmount,
      currency: chargedCurrency as PaymentCurrency,
      paymentMethod: 'CREDIT_CARD',
      description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      metadata: {
        type: 'subscription',
        planId: params.planId,
        billingInterval,
        tenantId: params.tenantId,
        originalAmount: baseAmount,
        originalCurrency: baseCurrency,
        exchangeRate,
        chargedAmountTRY: chargedCurrency === 'TRY' ? chargedAmount : undefined,
        binCountry: binInfo?.country ?? undefined,
        binBank: binInfo?.bankName ?? undefined,
      },
    });

    const fullName = (params.customerName || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const name = parts[0] || 'Tenant';
    const surname = parts.slice(1).join(' ') || 'Admin';

    const chargeParams = {
      amount: chargedAmount,
      currency: chargedCurrency,
      description: `${product.name} Subscription`,
      card: {
        cardHolderName: params.card.cardholderName,
        cardNumber: params.card.cardNumber.replace(/\s/g, ''),
        expireMonth: params.card.expiryMonth,
        expireYear: params.card.expiryYear,
        cvc: params.card.cvv,
      },
      buyer: { id: params.tenantId, name, surname, email: params.customerEmail, ip: params.ip },
      basketItems: [{ id: params.planId, name: product.name, price: chargedAmount }],
      metadata: { paymentId: payment.paymentId },
    };

    // Auto-3DS: commercial or Turkish cards go through 3D Secure when possible.
    const use3ds =
      !!params.callbackUrl &&
      PaymentService.supports3dsCardPayment(provider) &&
      !!(binInfo?.force3ds || binInfo?.isTurkish);

    if (use3ds) {
      const init = await PaymentService.start3dsCharge(
        params.tenantId,
        { ...chargeParams, callbackUrl: params.callbackUrl! },
        provider,
      );
      if (init.status !== 'success' || !init.htmlContent) {
        await PaymentService.markAsFailed(payment.paymentId, init.errorCode, init.errorMessage);
        throw new Error(init.errorMessage || SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED);
      }
      // Mid-3DS: mark PROCESSING so the (idempotent) callback can finalize it.
      await PaymentService.update(payment.paymentId, { status: 'PROCESSING' });
      return { status: 'requires_3ds', paymentId: payment.paymentId, htmlContent: init.htmlContent, chargedAmount, chargedCurrency, exchangeRate };
    }

    const charge = await PaymentService.chargeWithCard(params.tenantId, chargeParams, provider);

    if (charge.status !== 'success') {
      await PaymentService.markAsFailed(payment.paymentId, charge.errorCode, charge.errorMessage);
      throw new Error(charge.errorMessage || SUBSCRIPTION_MESSAGES.CARD_DECLINED);
    }

    if (charge.providerPaymentId) {
      await PaymentService.update(payment.paymentId, {
        providerPaymentId: charge.providerPaymentId,
        metadata: { ...((payment.metadata as object) || {}), providerPaymentId: charge.providerPaymentId },
      });
    }

    const subscription = await TenantSubscriptionService.confirmPayment(payment.paymentId);

    return { status: 'completed', paymentId: payment.paymentId, subscription, chargedAmount, chargedCurrency, exchangeRate };
  }

  /**
   * Finalize a 3DS subscription payment after the bank callback. `conversationId`
   * is our own paymentId (echoed back by iyzico); `providerPaymentId` is iyzico's.
   * On success the subscription is activated (idempotent via `confirmPayment`).
   */
  static async complete3dsCardPayment(params: {
    tenantId: string;
    conversationId: string;
    providerPaymentId: string;
    provider?: PaymentProvider;
  }): Promise<TenantSubscription> {
    const provider: PaymentProvider = params.provider ?? 'IYZICO';
    const ourPaymentId = params.conversationId;

    const result = await PaymentService.complete3dsCharge(
      params.tenantId,
      { conversationId: params.conversationId, paymentId: params.providerPaymentId },
      provider,
    );

    if (result.status !== 'success') {
      await PaymentService.markAsFailed(ourPaymentId, result.errorCode, result.errorMessage);
      throw new Error(result.errorMessage || SUBSCRIPTION_MESSAGES.CARD_DECLINED);
    }

    if (result.providerPaymentId) {
      await PaymentService.update(ourPaymentId, { providerPaymentId: result.providerPaymentId });
    }

    return TenantSubscriptionService.confirmPayment(ourPaymentId);
  }
}
