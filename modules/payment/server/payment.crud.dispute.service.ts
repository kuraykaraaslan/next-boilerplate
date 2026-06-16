import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { PaymentProvider, PaymentCurrency } from './payment.enums';
import { SafePayment, PaymentTransaction } from './payment.types';
import { RefundPaymentDTO } from './payment.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import PaymentTransactionService from './payment.transaction.service';
import { clearPaymentCache } from './payment.crud.helpers';
import { getById } from './payment.crud.read.service';

export async function refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
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

  await clearPaymentCache(data.paymentId);
  return transaction;
}

/**
 * Record a chargeback/dispute opened against a payment (from a provider
 * webhook or manual intake). Stores status/reason/amount + provider id and
 * audits it; the payment row is the single source of dispute truth.
 */
export async function recordDispute(data: {
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
  await clearPaymentCache(data.paymentId);

  AuditLogService.log({
    tenantId: payment.tenantId ?? null, actorType: 'SYSTEM', action: 'payment.disputed',
    resourceType: 'payment', resourceId: data.paymentId,
    metadata: { providerDisputeId: data.providerDisputeId, reason: data.reason, amount: data.amount },
  }).catch(() => {});

  return getById(data.paymentId);
}

/** Resolve a dispute (WON / LOST). */
export async function resolveDispute(paymentId: string, outcome: 'WON' | 'LOST'): Promise<SafePayment> {
  const ds = await getDataSource();
  const payment = await ds.getRepository(PaymentEntity).findOne({ where: { paymentId } });
  if (!payment) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const writeDs = payment.tenantId ? await tenantDataSourceFor(payment.tenantId) : ds;
  await writeDs.getRepository(PaymentEntity).update({ paymentId }, {
    disputeStatus: outcome,
    disputeResolvedAt: new Date(),
  } as any);
  await clearPaymentCache(paymentId);
  AuditLogService.log({
    tenantId: payment.tenantId ?? null, actorType: 'SYSTEM', action: 'payment.dispute_resolved',
    resourceType: 'payment', resourceId: paymentId, metadata: { outcome },
  }).catch(() => {});
  return getById(paymentId);
}
