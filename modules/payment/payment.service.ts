import 'reflect-metadata';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { env } from '@/libs/env';
import { getDefaultTenantDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity';
import Logger from '@/libs/logger';
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './providers/base.provider';
import StripeProvider from './providers/stripe.provider';
import PaypalProvider from './providers/paypal.provider';
import IyzicoProvider from './providers/iyzico.provider';
import { PaymentProvider, PaymentCurrency } from './payment.enums';
import {
  SafePayment,
  SafePaymentSchema,
  PaymentTransaction,
  PaymentTransactionSchema,
  PaymentWithTransactions,
  PaymentWithTransactionsSchema,
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

export default class PaymentService {

  private static readonly stripeProvider = new StripeProvider();
  private static readonly paypalProvider = new PaypalProvider();
  private static readonly iyzicoProvider = new IyzicoProvider();

  private static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentService.stripeProvider],
    ['PAYPAL', PaymentService.paypalProvider],
    ['IYZICO', PaymentService.iyzicoProvider],
  ]);

  private static readonly DEFAULT_PROVIDER: PaymentProvider =
    (env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE';

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

  static async create(data: CreatePaymentDTO): Promise<SafePayment> {
    try {
      const ds = data.tenantId
        ? await tenantDataSourceFor(data.tenantId)
        : await getDefaultTenantDataSource();
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
    const ds = await getDefaultTenantDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId, deletedAt: IsNull() } });
    if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
    return SafePaymentSchema.parse(payment);
  }

  static async getByIdWithTransactions(paymentId: string): Promise<PaymentWithTransactions> {
    const ds = await getDefaultTenantDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId, deletedAt: IsNull() } });
    if (!payment) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
    const transactions = await ds.getRepository(PaymentTransactionEntity).find({ where: { paymentId } });
    return PaymentWithTransactionsSchema.parse({ ...payment, transactions });
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

    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(PaymentEntity);
    const [payments, total] = await Promise.all([
      repo.find({ where: where as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: where as any }),
    ]);

    return { payments: payments.map((p) => SafePaymentSchema.parse(p)), total };
  }

  static async update(paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
    const defaultDs = await getDefaultTenantDataSource();
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
      return SafePaymentSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED);
    }
  }

  static async delete(paymentId: string): Promise<void> {
    const defaultDs = await getDefaultTenantDataSource();
    const existing = await defaultDs.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!existing) throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);

    const ds = existing.tenantId ? await tenantDataSourceFor(existing.tenantId) : defaultDs;
    await ds.getRepository(PaymentEntity).update({ paymentId }, { deletedAt: new Date() });
  }

  static async createTransaction(data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await getDefaultTenantDataSource();
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
      return PaymentTransactionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED);
    }
  }

  static async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    const ds = await getDefaultTenantDataSource();
    const transaction = await ds.getRepository(PaymentTransactionEntity).findOne({ where: { transactionId } });
    if (!transaction) throw new Error(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND);
    return PaymentTransactionSchema.parse(transaction);
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

    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(PaymentTransactionEntity);
    const [transactions, total] = await Promise.all([
      repo.find({ where: where as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: where as any }),
    ]);

    return { transactions: transactions.map((t) => PaymentTransactionSchema.parse(t)), total };
  }

  static async updateTransaction(transactionId: string, data: UpdateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await getDefaultTenantDataSource();
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
      return PaymentTransactionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED);
    }
  }

  static async getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
    const { token, provider } = data;
    try {
      return await PaymentService.getProvider(provider).getPaymentStatus(token);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  static async refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
    const ds = await getDefaultTenantDataSource();
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

  static async createCheckoutSession(
    params: CheckoutSessionParams,
    providerName?: PaymentProvider
  ): Promise<CheckoutSessionResult> {
    return PaymentService.getProvider(providerName).createCheckoutSession(params);
  }
}
