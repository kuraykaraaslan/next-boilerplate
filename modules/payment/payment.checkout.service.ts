import BasePaymentProvider, {
  CheckoutSessionParams,
  CheckoutSessionResult,
  DirectChargeParams,
  DirectChargeResult,
  ThreeDSInitParams,
  ThreeDSInitResult,
  ThreeDSCompleteParams,
  WalletDescriptor,
  PaymentIntentParams,
  PaymentIntentResult,
} from './providers/base.provider';
import { PaymentProvider } from './payment.enums';
import { CardBinInfo } from './payment.types';
import { GetProviderStatusDTO } from './payment.dto';
import {
  getProvider, getAvailableProviders, getDefaultProvider,
  getSupportedWallets, getWalletMatrix, resolveEnabledProvider,
} from './payment.checkout.registry';
import {
  createCustomerPortalSession, createCheckoutSession, supportsDirectCardPayment,
  chargeWithCard, supports3dsCardPayment, start3dsCharge, complete3dsCharge,
  createPaymentIntent, getProviderStatus,
} from './payment.checkout.operations';
import { checkBin } from './payment.checkout.bin';

/**
 * Payment checkout service facade. The implementation is split across focused
 * modules (`payment.checkout.registry` provider registry/resolution,
 * `payment.checkout.operations` checkout/charge flows, `payment.checkout.bin`
 * BIN lookup); this class preserves the single `PaymentCheckoutService.*`
 * entry point its callers depend on.
 */
export default class PaymentCheckoutService {
  static getProvider(providerName?: PaymentProvider): BasePaymentProvider {
    return getProvider(providerName);
  }

  static getAvailableProviders(): PaymentProvider[] {
    return getAvailableProviders();
  }

  static getDefaultProvider(): PaymentProvider {
    return getDefaultProvider();
  }

  static getSupportedWallets(providerName?: PaymentProvider): WalletDescriptor[] {
    return getSupportedWallets(providerName);
  }

  static getWalletMatrix(): { provider: PaymentProvider; wallets: WalletDescriptor[] }[] {
    return getWalletMatrix();
  }

  static resolveEnabledProvider(tenantId: string, providerName?: PaymentProvider): Promise<PaymentProvider> {
    return resolveEnabledProvider(tenantId, providerName);
  }

  static createCustomerPortalSession(
    tenantId: string,
    params: { provider?: PaymentProvider; customerEmail?: string; customerExternalId?: string; returnUrl: string },
  ): Promise<{ url: string | null; note?: string; provider: string }> {
    return createCustomerPortalSession(tenantId, params);
  }

  static createCheckoutSession(tenantId: string, params: CheckoutSessionParams, providerName?: PaymentProvider): Promise<CheckoutSessionResult> {
    return createCheckoutSession(tenantId, params, providerName);
  }

  static supportsDirectCardPayment(providerName?: PaymentProvider): boolean {
    return supportsDirectCardPayment(providerName);
  }

  static chargeWithCard(tenantId: string, params: DirectChargeParams, providerName?: PaymentProvider): Promise<DirectChargeResult> {
    return chargeWithCard(tenantId, params, providerName);
  }

  static supports3dsCardPayment(providerName?: PaymentProvider): boolean {
    return supports3dsCardPayment(providerName);
  }

  static start3dsCharge(tenantId: string, params: ThreeDSInitParams, providerName?: PaymentProvider): Promise<ThreeDSInitResult> {
    return start3dsCharge(tenantId, params, providerName);
  }

  static complete3dsCharge(tenantId: string, params: ThreeDSCompleteParams, providerName?: PaymentProvider): Promise<DirectChargeResult> {
    return complete3dsCharge(tenantId, params, providerName);
  }

  static createPaymentIntent(tenantId: string, params: PaymentIntentParams, providerName?: PaymentProvider): Promise<PaymentIntentResult> {
    return createPaymentIntent(tenantId, params, providerName);
  }

  static getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
    return getProviderStatus(data);
  }

  static checkBin(tenantId: string, bin: string, providerName?: PaymentProvider): Promise<CardBinInfo> {
    return checkBin(tenantId, bin, providerName);
  }
}
