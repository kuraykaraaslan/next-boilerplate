import axios from 'axios';
import { env } from '@/modules/env';
import redis, { jitter } from '@/modules/redis';
import Logger from '@/modules/logger';
import BasePaymentProvider, {
  CheckoutSessionParams,
  CheckoutSessionResult,
  DirectChargeParams,
  DirectChargeResult,
  ProviderBinInfo,
  ThreeDSInitParams,
  ThreeDSInitResult,
  ThreeDSCompleteParams,
  WalletDescriptor,
  PaymentIntentParams,
  PaymentIntentResult,
} from './providers/base.provider';
import StripeProvider from './providers/stripe.provider';
import PaypalProvider from './providers/paypal.provider';
import IyzicoProvider from './providers/iyzico.provider';
import AlipayProvider from './providers/alipay.provider';
import WeChatPayProvider from './providers/wechatpay.provider';
import YooKassaProvider from './providers/yookassa.provider';
import CloudPaymentsProvider from './providers/cloudpayments.provider';
import { PaymentProvider } from './payment.enums';
import { CardBinInfo } from './payment.types';
import { GetProviderStatusDTO } from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class PaymentCheckoutService {

  // ──────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────

  private static readonly BIN_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days — BIN→country is static

  private static readonly stripeProvider = new StripeProvider();
  private static readonly paypalProvider = new PaypalProvider();
  private static readonly iyzicoProvider = new IyzicoProvider();
  private static readonly alipayProvider = new AlipayProvider();
  private static readonly wechatPayProvider = new WeChatPayProvider();
  private static readonly yookassaProvider = new YooKassaProvider();
  private static readonly cloudpaymentsProvider = new CloudPaymentsProvider();

  private static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentCheckoutService.stripeProvider],
    ['PAYPAL', PaymentCheckoutService.paypalProvider],
    ['IYZICO', PaymentCheckoutService.iyzicoProvider],
    ['ALIPAY', PaymentCheckoutService.alipayProvider],
    ['WECHATPAY', PaymentCheckoutService.wechatPayProvider],
    ['YOOKASSA', PaymentCheckoutService.yookassaProvider],
    ['CLOUDPAYMENTS', PaymentCheckoutService.cloudpaymentsProvider],
  ]);

  private static readonly DEFAULT_PROVIDER: PaymentProvider =
    (env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE';

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  static getProvider(providerName?: PaymentProvider): BasePaymentProvider {
    const name = providerName || PaymentCheckoutService.DEFAULT_PROVIDER;
    const provider = PaymentCheckoutService.PROVIDERS.get(name);
    if (!provider) {
      Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`);
      throw new AppError(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`, 400, ErrorCode.VALIDATION_ERROR);
    }
    return provider;
  }

  private static normalizeBrand(association?: string | null, scheme?: string | null): string | null {
    const a = (association || '').toUpperCase().replace(/[^A-Z]/g, '');
    const map: Record<string, string> = {
      VISA: 'VISA',
      MASTERCARD: 'MASTERCARD',
      MASTER: 'MASTERCARD',
      AMERICANEXPRESS: 'AMEX',
      AMEX: 'AMEX',
      TROY: 'TROY',
      DISCOVER: 'DISCOVER',
      JCB: 'JCB',
      UNIONPAY: 'UNIONPAY',
      MIR: 'MIR',
    };
    if (map[a]) return map[a];
    const s = (scheme || '').toUpperCase().replace(/[^A-Z]/g, '');
    return map[s] ?? (s ? s : null);
  }

  private static async lookupBinCountry(bin: string): Promise<{ country: string | null; scheme: string | null; bank: string | null } | null> {
    const clean = bin.replace(/\D/g, '').slice(0, 8);
    if (clean.length < 6) return null;
    const cacheKey = `bin:country:${clean}`;

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    try {
      const res = await axios.get(`https://lookup.binlist.net/${clean}`, {
        timeout: 5000,
        headers: { 'Accept-Version': '3', Accept: 'application/json' },
      });
      const data = res.data || {};
      const result = {
        country: data?.country?.alpha2 ?? null,
        scheme: data?.scheme ?? null,
        bank: data?.bank?.name ?? null,
      };
      await redis.setex(cacheKey, jitter(PaymentCheckoutService.BIN_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static getAvailableProviders(): PaymentProvider[] {
    return Array.from(PaymentCheckoutService.PROVIDERS.keys());
  }

  static getDefaultProvider(): PaymentProvider {
    return PaymentCheckoutService.DEFAULT_PROVIDER;
  }

  static getSupportedWallets(providerName?: PaymentProvider): WalletDescriptor[] {
    return PaymentCheckoutService.getProvider(providerName).supportedWallets;
  }

  static getWalletMatrix(): { provider: PaymentProvider; wallets: WalletDescriptor[] }[] {
    return Array.from(PaymentCheckoutService.PROVIDERS.entries()).map(([provider, impl]) => ({
      provider,
      wallets: impl.supportedWallets,
    }));
  }

  static async createCustomerPortalSession(
    tenantId: string,
    params: {
      provider?: PaymentProvider;
      customerEmail?: string;
      customerExternalId?: string;
      returnUrl: string;
    },
  ): Promise<{ url: string | null; note?: string; provider: string }> {
    const provider = PaymentCheckoutService.getProvider(params.provider);
    const result = await provider.createCustomerPortalSession(tenantId, {
      customerExternalId: params.customerExternalId,
      customerEmail: params.customerEmail,
      returnUrl: params.returnUrl,
    });
    return { ...result, provider: provider.name };
  }

  // Provider → its per-tenant enable flag setting.
  private static readonly ENABLED_KEY: Record<PaymentProvider, string> = {
    STRIPE: 'stripeEnabled', PAYPAL: 'paypalEnabled', IYZICO: 'iyzicoEnabled',
    ALIPAY: 'alipayEnabled', WECHATPAY: 'wechatPayEnabled',
    YOOKASSA: 'yookassaEnabled', CLOUDPAYMENTS: 'cloudpaymentsEnabled',
  };

  /**
   * Resolve the effective provider for a tenant: explicit choice, else the
   * tenant's `paymentDefaultProvider` setting, else the platform default. Then
   * enforce the per-tenant enable flag — a disabled provider is rejected so a
   * caller can't transact through a channel the tenant turned off.
   */
  static async resolveEnabledProvider(tenantId: string, providerName?: PaymentProvider): Promise<PaymentProvider> {
    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'paymentDefaultProvider').catch(() => null);
      name = (configured?.toUpperCase() as PaymentProvider) || PaymentCheckoutService.DEFAULT_PROVIDER;
    }
    const flagKey = PaymentCheckoutService.ENABLED_KEY[name];
    if (flagKey) {
      const enabled = await SettingService.getValue(tenantId, flagKey).catch(() => null);
      // Explicit 'false' disables; unset is treated as allowed (back-compat).
      if (enabled === 'false') {
        throw new AppError(`${PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED}: ${name} is disabled`, 422, ErrorCode.VALIDATION_ERROR);
      }
    }
    return name;
  }

  /** Reject card-testing / runaway checkout creation per customer (fraud guard). */
  private static async assertCheckoutVelocity(tenantId: string, identifier?: string): Promise<void> {
    if (!identifier) return;
    const key = `pay:velocity:${tenantId}:${identifier}`;
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 600);
      if (n > 10) throw new AppError('Too many payment attempts. Please wait a few minutes.', 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    } catch (err) {
      if (err instanceof AppError) throw err; // Redis errors fail open
    }
  }

  static async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
    providerName?: PaymentProvider,
  ): Promise<CheckoutSessionResult> {
    const resolved = await PaymentCheckoutService.resolveEnabledProvider(tenantId, providerName);
    await PaymentCheckoutService.assertCheckoutVelocity(tenantId, params.metadata?.customerEmail ?? params.metadata?.userId);
    const result = await PaymentCheckoutService.getProvider(resolved).createCheckoutSession(tenantId, params);
    // Card-data-touching event audit trail.
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'payment.checkout_session_created',
      resourceType: 'payment', resourceId: null,
      metadata: { provider: resolved, amount: params.amount, currency: params.currency },
    }).catch(() => {});
    return result;
  }

  static supportsDirectCardPayment(providerName?: PaymentProvider): boolean {
    return PaymentCheckoutService.getProvider(providerName).supportsDirectCardPayment;
  }

  static async chargeWithCard(
    tenantId: string,
    params: DirectChargeParams,
    providerName?: PaymentProvider,
  ): Promise<DirectChargeResult> {
    const provider = PaymentCheckoutService.getProvider(providerName);
    if (!provider.supportsDirectCardPayment) {
      throw new AppError(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
    }
    return provider.createPayment(tenantId, params);
  }

  static supports3dsCardPayment(providerName?: PaymentProvider): boolean {
    return PaymentCheckoutService.getProvider(providerName).supports3dsCardPayment;
  }

  static async start3dsCharge(
    tenantId: string,
    params: ThreeDSInitParams,
    providerName?: PaymentProvider,
  ): Promise<ThreeDSInitResult> {
    const provider = PaymentCheckoutService.getProvider(providerName);
    if (!provider.supports3dsCardPayment) {
      throw new AppError(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
    }
    return provider.create3dsPayment(tenantId, params);
  }

  static async complete3dsCharge(
    tenantId: string,
    params: ThreeDSCompleteParams,
    providerName?: PaymentProvider,
  ): Promise<DirectChargeResult> {
    return PaymentCheckoutService.getProvider(providerName).complete3dsPayment(tenantId, params);
  }

  static async createPaymentIntent(
    tenantId: string,
    params: PaymentIntentParams,
    providerName?: PaymentProvider,
  ): Promise<PaymentIntentResult> {
    return PaymentCheckoutService.getProvider(providerName).createPaymentIntent(tenantId, params);
  }

  static async getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
    const { tenantId, token, provider } = data;
    try {
      return await PaymentCheckoutService.getProvider(provider).getPaymentStatus(tenantId, token);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  static async checkBin(tenantId: string, bin: string, providerName?: PaymentProvider): Promise<CardBinInfo> {
    const clean = bin.replace(/\D/g, '').slice(0, 8);
    const provider = PaymentCheckoutService.getProvider(providerName);

    const [providerRes, countryRes] = await Promise.allSettled([
      provider.checkBin(tenantId, clean),
      PaymentCheckoutService.lookupBinCountry(clean),
    ]);

    const pBin: ProviderBinInfo = providerRes.status === 'fulfilled' ? providerRes.value : { supported: false };
    const country = countryRes.status === 'fulfilled' ? countryRes.value : null;

    const brand = PaymentCheckoutService.normalizeBrand(pBin.cardAssociation, country?.scheme);
    const bankName = pBin.bankName ?? country?.bank ?? null;
    const isTurkish = country?.country === 'TR' || (pBin.supported === true && !!pBin.bankName);

    return {
      bin: clean,
      brand,
      bankName,
      cardType: pBin.cardType ?? null,
      commercial: pBin.commercial === true,
      country: country?.country ?? null,
      isTurkish,
      force3ds: pBin.commercial === true,
    };
  }
}
