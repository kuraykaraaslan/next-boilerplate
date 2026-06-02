import 'reflect-metadata';
import axios from 'axios';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { env } from '@/modules/env';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity';
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
import { PaymentProvider, PaymentCurrency } from './payment.enums';
import {
  SafePayment,
  SafePaymentSchema,
  PaymentTransaction,
  PaymentTransactionSchema,
  PaymentWithTransactions,
  PaymentWithTransactionsSchema,
  CardBinInfo,
} from './payment.types';
import {
  CreatePaymentDTO,
  UpdatePaymentDTO,
  GetPaymentsQuery,
  GetProviderStatusDTO,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  GetTransactionsQuery,
  RefundPaymentDTO,
} from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';

const PAYMENT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class PaymentService {

  private static readonly stripeProvider = new StripeProvider();
  private static readonly paypalProvider = new PaypalProvider();
  private static readonly iyzicoProvider = new IyzicoProvider();
  private static readonly alipayProvider = new AlipayProvider();
  private static readonly wechatPayProvider = new WeChatPayProvider();
  private static readonly yookassaProvider = new YooKassaProvider();
  private static readonly cloudpaymentsProvider = new CloudPaymentsProvider();

  private static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentService.stripeProvider],
    ['PAYPAL', PaymentService.paypalProvider],
    ['IYZICO', PaymentService.iyzicoProvider],
    ['ALIPAY', PaymentService.alipayProvider],
    ['WECHATPAY', PaymentService.wechatPayProvider],
    ['YOOKASSA', PaymentService.yookassaProvider],
    ['CLOUDPAYMENTS', PaymentService.cloudpaymentsProvider],
  ]);

  private static readonly DEFAULT_PROVIDER: PaymentProvider =
    (env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE';

  private static async clearPaymentCache(paymentId: string): Promise<void> {
    await Promise.all([
      redis.del(`payment:id:${paymentId}`).catch(() => {}),
      redis.del(`payment:tx:${paymentId}`).catch(() => {}),
    ]);
  }

  private static async clearTransactionCache(transactionId: string, paymentId?: string): Promise<void> {
    const ops: Promise<unknown>[] = [redis.del(`payment_tx:id:${transactionId}`)];
    if (paymentId) ops.push(redis.del(`payment:tx:${paymentId}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  /**
   * Provider-agnostic customer portal. Routes to the configured provider's
   * own self-service portal (Stripe Billing Portal, PayPal subscription mgmt,
   * …) — providers without a portal return `{ url: null, note }` so the UI
   * can fall back to in-app management.
   */
  static async createCustomerPortalSession(
    tenantId: string,
    params: {
      provider?: PaymentProvider;
      customerEmail?: string;
      customerExternalId?: string;
      returnUrl: string;
    },
  ): Promise<{ url: string | null; note?: string; provider: string }> {
    const provider = PaymentService.getProvider(params.provider);
    const result = await provider.createCustomerPortalSession(tenantId, {
      customerExternalId: params.customerExternalId,
      customerEmail: params.customerEmail,
      returnUrl: params.returnUrl,
    });
    return { ...result, provider: provider.name };
  }

  private static getProvider(providerName?: PaymentProvider): BasePaymentProvider {
    const name = providerName || PaymentService.DEFAULT_PROVIDER;
    const provider = PaymentService.PROVIDERS.get(name);
    if (!provider) {
      Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`);
      throw new Error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`);
    }
    return provider;
  }

  static getAvailableProviders(): PaymentProvider[] {
    return Array.from(PaymentService.PROVIDERS.keys());
  }

  static getDefaultProvider(): PaymentProvider {
    return PaymentService.DEFAULT_PROVIDER;
  }

  /** Wallets / APMs a provider can surface (with delivery: hosted / client element / direct). */
  static getSupportedWallets(providerName?: PaymentProvider): WalletDescriptor[] {
    return PaymentService.getProvider(providerName).supportedWallets;
  }

  /** Wallet capability matrix across every registered provider (for UI / registry). */
  static getWalletMatrix(): { provider: PaymentProvider; wallets: WalletDescriptor[] }[] {
    return Array.from(PaymentService.PROVIDERS.entries()).map(([provider, impl]) => ({
      provider,
      wallets: impl.supportedWallets,
    }));
  }

  static async create(data: CreatePaymentDTO): Promise<SafePayment> {
    try {
      const ds = data.tenantId
        ? await tenantDataSourceFor(data.tenantId)
        : await getDataSource();
      const repo = ds.getRepository(PaymentEntity);
      const payment = repo.create({
        userId: data.userId,
        tenantId: data.tenantId,
        provider: data.provider,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        description: data.description,
        metadata: data.metadata,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        billingAddress: data.billingAddress,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      });
      const saved = await repo.save(payment);
      return SafePaymentSchema.parse(saved);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED);
    }
  }

  static async getById(paymentId: string): Promise<SafePayment> {
    const cacheKey = `payment:id:${paymentId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafePaymentSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId, deletedAt: IsNull() } });
      if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);

      const parsed = SafePaymentSchema.parse(payment);
      await redis.setex(cacheKey, jitter(PAYMENT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getByIdWithTransactions(paymentId: string): Promise<PaymentWithTransactions> {
    const cacheKey = `payment:tx:${paymentId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return PaymentWithTransactionsSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId, deletedAt: IsNull() } });
      if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
      const transactions = await ds.getRepository(PaymentTransactionEntity).find({ where: { paymentId } });

      const parsed = PaymentWithTransactionsSchema.parse({ ...payment, transactions });
      await redis.setex(cacheKey, jitter(PAYMENT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getAll(query: GetPaymentsQuery): Promise<{ payments: SafePayment[]; total: number }> {
    const { page, pageSize, userId, tenantId, provider, status, currency, fromDate, toDate } = query;

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (userId) where.userId = userId;
    if (tenantId) where.tenantId = tenantId;
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (currency) where.currency = currency;
    if (fromDate && toDate) where.createdAt = Between(fromDate, toDate);
    else if (fromDate) where.createdAt = MoreThanOrEqual(fromDate);
    else if (toDate) where.createdAt = LessThanOrEqual(toDate);

    const ds = await getDataSource();
    const repo = ds.getRepository(PaymentEntity);
    const [payments, total] = await Promise.all([
      repo.find({ where: where as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: where as any }),
    ]);

    return { payments: payments.map((p) => SafePaymentSchema.parse(p)), total };
  }

  static async update(paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
    const defaultDs = await getDataSource();
    const existing = await defaultDs.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!existing) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);

    const ds = existing.tenantId
      ? await tenantDataSourceFor(existing.tenantId)
      : defaultDs;

    try {
      await ds.getRepository(PaymentEntity).update({ paymentId }, {
        status: data.status,
        paymentMethod: data.paymentMethod,
        providerPaymentId: data.providerPaymentId,
        description: data.description,
        metadata: data.metadata,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        billingAddress: data.billingAddress,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        paidAt: data.status === 'COMPLETED' && !existing.paidAt ? new Date() : undefined,
        cancelledAt: data.status === 'CANCELLED' && !existing.cancelledAt ? new Date() : undefined,
      } as any);
      const updated = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId } });
      await this.clearPaymentCache(paymentId);
      return SafePaymentSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED);
    }
  }

  static async delete(paymentId: string): Promise<void> {
    const defaultDs = await getDataSource();
    const existing = await defaultDs.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!existing) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);

    const ds = existing.tenantId ? await tenantDataSourceFor(existing.tenantId) : defaultDs;
    await ds.getRepository(PaymentEntity).update({ paymentId }, { deletedAt: new Date() });
    await this.clearPaymentCache(paymentId);
  }

  static async createTransaction(data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId: data.paymentId } });
    if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);

    try {
      const repo = ds.getRepository(PaymentTransactionEntity);
      const transaction = repo.create({
        paymentId: data.paymentId,
        provider: data.provider,
        providerTransactionId: data.providerTransactionId,
        type: data.type,
        status: 'PENDING',
        amount: data.amount,
        currency: data.currency,
        fee: data.fee,
        net: data.net,
        providerResponse: data.providerResponse,
        parentTransactionId: data.parentTransactionId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
      const saved = await repo.save(transaction);
      await redis.del(`payment:tx:${data.paymentId}`).catch(() => {});
      return PaymentTransactionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED);
    }
  }

  static async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    const cacheKey = `payment_tx:id:${transactionId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return PaymentTransactionSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const transaction = await ds.getRepository(PaymentTransactionEntity).findOne({ where: { transactionId } });
      if (!transaction) throw new Error(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND);

      const parsed = PaymentTransactionSchema.parse(transaction);
      await redis.setex(cacheKey, jitter(PAYMENT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getTransactions(query: GetTransactionsQuery): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const { page, pageSize, paymentId, provider, type, status, fromDate, toDate } = query;

    const where: Record<string, unknown> = {};
    if (paymentId) where.paymentId = paymentId;
    if (provider) where.provider = provider;
    if (type) where.type = type;
    if (status) where.status = status;
    if (fromDate && toDate) where.createdAt = Between(fromDate, toDate);
    else if (fromDate) where.createdAt = MoreThanOrEqual(fromDate);
    else if (toDate) where.createdAt = LessThanOrEqual(toDate);

    const ds = await getDataSource();
    const repo = ds.getRepository(PaymentTransactionEntity);
    const [transactions, total] = await Promise.all([
      repo.find({ where: where as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: where as any }),
    ]);

    return { transactions: transactions.map((t) => PaymentTransactionSchema.parse(t)), total };
  }

  static async updateTransaction(transactionId: string, data: UpdateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PaymentTransactionEntity);
    const existing = await repo.findOne({ where: { transactionId } });
    if (!existing) throw new Error(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND);

    try {
      await repo.update({ transactionId }, {
        status: data.status,
        providerTransactionId: data.providerTransactionId,
        fee: data.fee,
        net: data.net,
        providerResponse: data.providerResponse,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        processedAt: data.processedAt || (data.status === 'COMPLETED' ? new Date() : undefined),
      } as any);
      const updated = await repo.findOne({ where: { transactionId } });
      await this.clearTransactionCache(transactionId, existing.paymentId);
      return PaymentTransactionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED);
    }
  }

  static async getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
    const { tenantId, token, provider } = data;
    try {
      return await PaymentService.getProvider(provider).getPaymentStatus(tenantId, token);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  static async refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId: data.paymentId } });
    if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.status !== 'COMPLETED') throw new Error(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED);

    const refundAmount = data.amount || Number(payment.amount);
    const alreadyRefunded = Number(payment.refundedAmount) || 0;
    const maxRefundable = Number(payment.amount) - alreadyRefunded;
    if (refundAmount > maxRefundable) throw new Error(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT);

    const transaction = await PaymentService.createTransaction({
      paymentId: data.paymentId,
      provider: payment.provider as PaymentProvider,
      type: 'REFUND',
      amount: refundAmount,
      currency: payment.currency as PaymentCurrency,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    const newRefundedAmount = alreadyRefunded + refundAmount;
    const isFullyRefunded = newRefundedAmount >= Number(payment.amount);

    const refundDs = payment.tenantId ? await tenantDataSourceFor(payment.tenantId) : ds;
    await refundDs.getRepository(PaymentEntity).update({ paymentId: data.paymentId }, {
      refundedAmount: newRefundedAmount,
      status: isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAt: isFullyRefunded ? new Date() : payment.refundedAt,
    } as any);

    await this.clearPaymentCache(data.paymentId);

    return transaction;
  }

  static async getPaymentsByUser(userId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentService.getAll({ userId, page, pageSize });
  }

  static async getPaymentsByTenant(tenantId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentService.getAll({ tenantId, page, pageSize });
  }

  static async markAsCompleted(paymentId: string, providerPaymentId?: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, { status: 'COMPLETED', providerPaymentId });
  }

  static async markAsFailed(paymentId: string, failureCode?: string, failureMessage?: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, { status: 'FAILED', failureCode, failureMessage });
  }

  static async markAsCancelled(paymentId: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, { status: 'CANCELLED' });
  }

  /**
   * Create a checkout session for a tenant. The tenant's own provider API
   * keys (Setting rows scoped to `tenantId`) are used to authenticate the
   * outbound call, so every tenant can collect payments via its own
   * Stripe / PayPal / Iyzico / etc. account.
   */
  static async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
    providerName?: PaymentProvider
  ): Promise<CheckoutSessionResult> {
    return PaymentService.getProvider(providerName).createCheckoutSession(tenantId, params);
  }

  // ==========================================================================
  // Direct (non-3DS) card charging + BIN check — shared by all providers via
  // the provider map. Providers that don't support raw-card collection fall
  // back to the hosted redirect flow (see `supportsDirectCardPayment`).
  // ==========================================================================

  /** Whether the given provider can charge a raw card directly (our own form). */
  static supportsDirectCardPayment(providerName?: PaymentProvider): boolean {
    return PaymentService.getProvider(providerName).supportsDirectCardPayment;
  }

  /**
   * Charge a raw card directly. Routes to the provider's own non-3DS
   * implementation. Throws if the provider has no direct-charge support.
   */
  static async chargeWithCard(
    tenantId: string,
    params: DirectChargeParams,
    providerName?: PaymentProvider,
  ): Promise<DirectChargeResult> {
    const provider = PaymentService.getProvider(providerName);
    if (!provider.supportsDirectCardPayment) {
      throw new Error(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED);
    }
    return provider.createPayment(tenantId, params);
  }

  /** Whether the given provider supports a 3D Secure card flow. */
  static supports3dsCardPayment(providerName?: PaymentProvider): boolean {
    return PaymentService.getProvider(providerName).supports3dsCardPayment;
  }

  /**
   * Start a 3DS charge. Returns base64 HTML to render (full-page redirect / popup)
   * for the bank's 3DS page; the bank then POSTs to `params.callbackUrl`.
   */
  static async start3dsCharge(
    tenantId: string,
    params: ThreeDSInitParams,
    providerName?: PaymentProvider,
  ): Promise<ThreeDSInitResult> {
    const provider = PaymentService.getProvider(providerName);
    if (!provider.supports3dsCardPayment) {
      throw new Error(PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED);
    }
    return provider.create3dsPayment(tenantId, params);
  }

  /** Finalize a 3DS charge after the bank callback. */
  static async complete3dsCharge(
    tenantId: string,
    params: ThreeDSCompleteParams,
    providerName?: PaymentProvider,
  ): Promise<DirectChargeResult> {
    return PaymentService.getProvider(providerName).complete3dsPayment(tenantId, params);
  }

  /**
   * Create a client-side PaymentIntent for the Express Checkout Element (Stripe:
   * Apple/Google Pay, Click to Pay, Link, PayPal…). Routes via the provider.
   */
  static async createPaymentIntent(
    tenantId: string,
    params: PaymentIntentParams,
    providerName?: PaymentProvider,
  ): Promise<PaymentIntentResult> {
    return PaymentService.getProvider(providerName).createPaymentIntent(tenantId, params);
  }

  private static readonly BIN_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days — BIN→country is static

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

  /**
   * Public BIN→country lookup (binlist.net). Best-effort and cached for a week;
   * a failure resolves to `null` so it never blocks a checkout.
   */
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
      await redis.setex(cacheKey, jitter(PaymentService.BIN_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    } catch {
      // binlist is rate-limited / flaky — degrade gracefully.
      return null;
    }
  }

  /**
   * Combined BIN check: the provider's own BIN lookup (brand / bank / type /
   * commercial) plus a public BIN→country lookup. A card counts as Turkish when
   * the BIN country is TR **or** the provider returned a (Turkish) bank.
   */
  static async checkBin(tenantId: string, bin: string, providerName?: PaymentProvider): Promise<CardBinInfo> {
    const clean = bin.replace(/\D/g, '').slice(0, 8);
    const provider = PaymentService.getProvider(providerName);

    const [providerRes, countryRes] = await Promise.allSettled([
      provider.checkBin(tenantId, clean),
      PaymentService.lookupBinCountry(clean),
    ]);

    const pBin: ProviderBinInfo = providerRes.status === 'fulfilled' ? providerRes.value : { supported: false };
    const country = countryRes.status === 'fulfilled' ? countryRes.value : null;

    const brand = PaymentService.normalizeBrand(pBin.cardAssociation, country?.scheme);
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
