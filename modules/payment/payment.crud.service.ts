import 'reflect-metadata';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { env } from '@/modules/env';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { Payment as PaymentEntity } from './entities/payment.entity';
import Logger from '@/modules/logger';
import { PaymentProvider, PaymentCurrency } from './payment.enums';
import {
  SafePayment,
  SafePaymentSchema,
  PaymentWithTransactions,
  PaymentWithTransactionsSchema,
  PaymentTransaction,
} from './payment.types';
import {
  CreatePaymentDTO,
  UpdatePaymentDTO,
  GetPaymentsQuery,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  GetTransactionsQuery,
  RefundPaymentDTO,
} from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import PaymentTransactionService from './payment.transaction.service';

export { PaymentTransactionService };

const PAYMENT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class PaymentCrudService {

  static async clearPaymentCache(paymentId: string): Promise<void> {
    await Promise.all([
      redis.del(`payment:id:${paymentId}`).catch(() => {}),
      redis.del(`payment:tx:${paymentId}`).catch(() => {}),
    ]);
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
      throw new AppError(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
      if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
      if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      const txResult = await PaymentTransactionService.getTransactions({ paymentId, page: 0, pageSize: 1000 });

      const parsed = PaymentWithTransactionsSchema.parse({ ...payment, transactions: txResult.transactions });
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
    if (!existing) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
      await PaymentCrudService.clearPaymentCache(paymentId);
      return SafePaymentSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async delete(paymentId: string): Promise<void> {
    const defaultDs = await getDataSource();
    const existing = await defaultDs.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!existing) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const ds = existing.tenantId ? await tenantDataSourceFor(existing.tenantId) : defaultDs;
    await ds.getRepository(PaymentEntity).update({ paymentId }, { deletedAt: new Date() });
    await PaymentCrudService.clearPaymentCache(paymentId);
  }

  static async getPaymentsByUser(userId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentCrudService.getAll({ userId, page, pageSize });
  }

  static async getPaymentsByTenant(tenantId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentCrudService.getAll({ tenantId, page, pageSize });
  }

  static async markAsCompleted(paymentId: string, providerPaymentId?: string): Promise<SafePayment> {
    return PaymentCrudService.update(paymentId, { status: 'COMPLETED', providerPaymentId });
  }

  static async markAsFailed(paymentId: string, failureCode?: string, failureMessage?: string): Promise<SafePayment> {
    return PaymentCrudService.update(paymentId, { status: 'FAILED', failureCode, failureMessage });
  }

  static async markAsCancelled(paymentId: string): Promise<SafePayment> {
    return PaymentCrudService.update(paymentId, { status: 'CANCELLED' });
  }

  static async refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId: data.paymentId } });
    if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (payment.status !== 'COMPLETED') throw new AppError(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);

    const refundAmount = data.amount || Number(payment.amount);
    const alreadyRefunded = Number(payment.refundedAmount) || 0;
    const maxRefundable = Number(payment.amount) - alreadyRefunded;
    if (refundAmount > maxRefundable) throw new AppError(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT, 422, ErrorCode.VALIDATION_ERROR);

    const transaction = await PaymentTransactionService.createTransaction({
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

    await PaymentCrudService.clearPaymentCache(data.paymentId);
    return transaction;
  }

  /**
   * Record a chargeback/dispute opened against a payment (from a provider
   * webhook or manual intake). Stores status/reason/amount + provider id and
   * audits it; the payment row is the single source of dispute truth.
   */
  static async recordDispute(data: {
    paymentId: string;
    providerDisputeId?: string;
    reason?: string;
    amount?: number;
    status?: string;
  }): Promise<SafePayment> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId: data.paymentId } });
    if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const writeDs = payment.tenantId ? await tenantDataSourceFor(payment.tenantId) : ds;
    await writeDs.getRepository(PaymentEntity).update({ paymentId: data.paymentId }, {
      disputeStatus: data.status ?? 'NEEDS_RESPONSE',
      disputeReason: data.reason,
      disputeAmount: data.amount ?? Number(payment.amount),
      providerDisputeId: data.providerDisputeId,
      disputedAt: new Date(),
    } as any);
    await PaymentCrudService.clearPaymentCache(data.paymentId);

    AuditLogService.log({
      tenantId: payment.tenantId ?? null, actorType: 'SYSTEM', action: 'payment.disputed',
      resourceType: 'payment', resourceId: data.paymentId,
      metadata: { providerDisputeId: data.providerDisputeId, reason: data.reason, amount: data.amount },
    }).catch(() => {});

    return PaymentCrudService.getById(data.paymentId);
  }

  /** Resolve a dispute (WON / LOST). */
  static async resolveDispute(paymentId: string, outcome: 'WON' | 'LOST'): Promise<SafePayment> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const writeDs = payment.tenantId ? await tenantDataSourceFor(payment.tenantId) : ds;
    await writeDs.getRepository(PaymentEntity).update({ paymentId }, {
      disputeStatus: outcome,
      disputeResolvedAt: new Date(),
    } as any);
    await PaymentCrudService.clearPaymentCache(paymentId);
    AuditLogService.log({
      tenantId: payment.tenantId ?? null, actorType: 'SYSTEM', action: 'payment.dispute_resolved',
      resourceType: 'payment', resourceId: paymentId, metadata: { outcome },
    }).catch(() => {});
    return PaymentCrudService.getById(paymentId);
  }

  // Transaction delegates
  static createTransaction        = PaymentTransactionService.createTransaction.bind(PaymentTransactionService);
  static getTransactionById       = PaymentTransactionService.getTransactionById.bind(PaymentTransactionService);
  static getTransactions          = PaymentTransactionService.getTransactions.bind(PaymentTransactionService);
  static updateTransaction        = PaymentTransactionService.updateTransaction.bind(PaymentTransactionService);
}
