import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import { Payment as PaymentEntity } from './entities/payment.entity';
import Logger from '@nb/logger';
import { SafePayment, SafePaymentSchema } from './payment.types';
import { CreatePaymentDTO, UpdatePaymentDTO } from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { clearPaymentCache } from './payment.crud.helpers';

export async function create(data: CreatePaymentDTO): Promise<SafePayment> {
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

export async function update(paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
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
    await clearPaymentCache(paymentId);
    return SafePaymentSchema.parse(updated!);
  } catch (error) {
    Logger.error(`${PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    throw new AppError(PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

export async function remove(paymentId: string): Promise<void> {
  const defaultDs = await getDataSource();
  const existing = await defaultDs.getRepository(PaymentEntity).findOne({ where: { paymentId } });
  if (!existing) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const ds = existing.tenantId ? await tenantDataSourceFor(existing.tenantId) : defaultDs;
  await ds.getRepository(PaymentEntity).update({ paymentId }, { deletedAt: new Date() });
  await clearPaymentCache(paymentId);
}

export async function markAsCompleted(paymentId: string, providerPaymentId?: string): Promise<SafePayment> {
  return update(paymentId, { status: 'COMPLETED', providerPaymentId });
}

export async function markAsFailed(paymentId: string, failureCode?: string, failureMessage?: string): Promise<SafePayment> {
  return update(paymentId, { status: 'FAILED', failureCode, failureMessage });
}

export async function markAsCancelled(paymentId: string): Promise<SafePayment> {
  return update(paymentId, { status: 'CANCELLED' });
}
