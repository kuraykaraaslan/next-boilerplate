import 'reflect-metadata';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { getDataSource } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity';
import Logger from '@kuraykaraaslan/logger';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './payment.types';
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  GetTransactionsQuery,
} from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

const PAYMENT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class PaymentTransactionService {

  static async clearTransactionCache(transactionId: string, paymentId?: string): Promise<void> {
    const ops: Promise<unknown>[] = [redis.del(`payment_tx:id:${transactionId}`)];
    if (paymentId) ops.push(redis.del(`payment:tx:${paymentId}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static async createTransaction(data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await getDataSource();
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId: data.paymentId } });
    if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
      throw new AppError(PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
      if (!transaction) throw new AppError(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
    if (!existing) throw new AppError(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
      await PaymentTransactionService.clearTransactionCache(transactionId, existing.paymentId);
      return PaymentTransactionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
