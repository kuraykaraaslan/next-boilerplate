import 'reflect-metadata';
import type { PaymentProvider, CreditCardInput } from '@kuraykaraaslan/payment/server/payment.enums';
import type { TenantSubscription } from './tenant_subscription.types';
import { quote, payWithCard, complete3dsCardPayment } from './tenant_subscription.card.operations';

/**
 * Direct card checkout for tenant subscriptions: the custom card form with
 * automatic TRY conversion for Turkish cards and auto-3DS. Hosted checkout and
 * Stripe Element wallets live in TenantCheckoutService; activation is delegated
 * back to {@link TenantSubscriptionService.confirmPayment}.
 *
 * The charge-resolution helper (`tenant_subscription.card.helpers`) and the
 * quote/pay/complete operations (`tenant_subscription.card.operations`) hold the
 * implementation; this class preserves the `TenantCardCheckoutService.*` entry point.
 */
export default class TenantCardCheckoutService {
  static quote(tenantId: string, planId: string, bin: string, provider: PaymentProvider = 'IYZICO'): Promise<{
    baseAmount: number;
    baseCurrency: string;
    isTurkish: boolean;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number | null;
    brand: string | null;
    bankName: string | null;
  }> {
    return quote(tenantId, planId, bin, provider);
  }

  static payWithCard(params: {
    tenantId: string;
    planId: string;
    card: CreditCardInput;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
    ip?: string;
    callbackUrl?: string;
  }): Promise<
    | { status: 'completed'; paymentId: string; subscription: TenantSubscription; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
    | { status: 'requires_3ds'; paymentId: string; htmlContent: string; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
  > {
    return payWithCard(params);
  }

  static complete3dsCardPayment(params: {
    tenantId: string;
    conversationId: string;
    providerPaymentId: string;
    provider?: PaymentProvider;
  }): Promise<TenantSubscription> {
    return complete3dsCardPayment(params);
  }
}
