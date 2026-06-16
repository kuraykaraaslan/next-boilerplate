import 'reflect-metadata';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { getDataSource } from '@nb/db';
import redis, { jitter, singleFlight } from '@nb/redis';
import { Payment as PaymentEntity } from './entities/payment.entity';
import {
  SafePayment,
  SafePaymentSchema,
  PaymentWithTransactions,
  PaymentWithTransactionsSchema,
} from './payment.types';
import { GetPaymentsQuery } from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import PaymentTransactionService from './payment.transaction.service';
import { PAYMENT_CACHE_TTL } from './payment.crud.helpers';

export async function getById(paymentId: string): Promise<SafePayment> {
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

export async function getByIdWithTransactions(paymentId: string): Promise<PaymentWithTransactions> {
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

export async function getAll(query: GetPaymentsQuery): Promise<{ payments: SafePayment[]; total: number }> {
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

export async function getPaymentsByUser(userId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
  return getAll({ userId, page, pageSize });
}

export async function getPaymentsByTenant(tenantId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
  return getAll({ tenantId, page, pageSize });
}
