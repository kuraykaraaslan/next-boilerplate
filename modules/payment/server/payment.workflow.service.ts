import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity';
import { SafePayment, SafePaymentSchema } from './payment.types';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { clearPaymentCache } from './payment.crud.helpers';

type WorkflowAction = 'authorize' | 'capture' | 'fail';

// Maps the gateway lifecycle PENDING -> AUTHORIZED -> CAPTURED -> (REFUNDED | FAILED)
// onto the persisted PaymentStatus enum: authorize parks the payment in PROCESSING
// (authorised, funds held), capture settles it to COMPLETED, fail terminates it.
const TRANSITIONS: Record<WorkflowAction, { from: string[]; to: string; txType: string; verb: string }> = {
  authorize: { from: ['PENDING'],               to: 'PROCESSING', txType: 'PAYMENT', verb: 'authorized' },
  capture:   { from: ['PENDING', 'PROCESSING'], to: 'COMPLETED',  txType: 'PAYMENT', verb: 'captured' },
  fail:      { from: ['PENDING', 'PROCESSING'], to: 'FAILED',     txType: 'PAYMENT', verb: 'failed' },
};

/**
 * Status-workflow engine for a Payment document. Each transition asserts the
 * current status is allowed, sets the new status, appends a PaymentTransaction
 * event/log row, and recomputes the captured/refunded totals into metadata.
 */
export default class PaymentWorkflowService {
  private static async dsFor(tenantId: string, payment: PaymentEntity) {
    return payment.tenantId ? await tenantDataSourceFor(payment.tenantId) : await tenantDataSourceFor(tenantId);
  }

  private static async transition(
    tenantId: string,
    paymentId: string,
    action: WorkflowAction,
    opts: { failureCode?: string; failureMessage?: string } = {},
  ): Promise<SafePayment> {
    const def = TRANSITIONS[action];
    const root = await getDataSource();
    const existing = await root.getRepository(PaymentEntity).findOne({ where: { paymentId } });
    if (!existing) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const ds = await this.dsFor(tenantId, existing);
    const repo = ds.getRepository(PaymentEntity);
    const row = await repo.findOne({ where: { paymentId } });
    if (!row) throw new AppError(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (!def.from.includes(row.status)) {
      throw new AppError(`${PAYMENT_MESSAGES.INVALID_TRANSITION} (${row.status} -> ${def.to})`, 409, ErrorCode.VALIDATION_ERROR);
    }

    row.status = def.to;
    if (action === 'capture') row.paidAt = row.paidAt ?? new Date();
    if (action === 'fail') {
      row.failureCode = opts.failureCode ?? row.failureCode;
      row.failureMessage = opts.failureMessage ?? row.failureMessage;
    }
    await repo.save(row);

    // Append the workflow event as a PaymentTransaction log row.
    const txRepo = ds.getRepository(PaymentTransactionEntity);
    await txRepo.save(txRepo.create({
      paymentId: row.paymentId,
      provider: row.provider,
      type: def.txType,
      status: action === 'fail' ? 'FAILED' : 'COMPLETED',
      amount: row.amount,
      currency: row.currency,
      errorCode: action === 'fail' ? opts.failureCode : undefined,
      errorMessage: action === 'fail' ? opts.failureMessage : undefined,
      processedAt: new Date(),
    }));

    await this.recomputeTotals(ds, row.paymentId);
    await clearPaymentCache(row.paymentId);

    const fresh = await repo.findOne({ where: { paymentId } });
    return SafePaymentSchema.parse(fresh!);
  }

  /** Recompute captured/refunded amounts from COMPLETED transactions into metadata. */
  static async recomputeTotals(ds: Awaited<ReturnType<typeof getDataSource>>, paymentId: string): Promise<{ captured: number; refunded: number }> {
    const txRepo = ds.getRepository(PaymentTransactionEntity);
    const txns = await txRepo.find({ where: { paymentId, status: 'COMPLETED' } });
    let captured = 0;
    let refunded = 0;
    for (const tx of txns) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'REFUND') refunded += amt;
      else if (tx.type === 'PAYMENT') captured += amt;
    }
    const repo = ds.getRepository(PaymentEntity);
    const row = await repo.findOne({ where: { paymentId } });
    if (row) {
      const md = (row.metadata ?? {}) as Record<string, unknown>;
      row.metadata = { ...md, capturedAmount: captured, refundedAmount: refunded };
      if (refunded > 0) row.refundedAmount = refunded;
      await repo.save(row);
    }
    return { captured, refunded };
  }

  static authorize(tenantId: string, paymentId: string) { return this.transition(tenantId, paymentId, 'authorize'); }
  static capture(tenantId: string, paymentId: string) { return this.transition(tenantId, paymentId, 'capture'); }
  static fail(tenantId: string, paymentId: string, failureCode?: string, failureMessage?: string) {
    return this.transition(tenantId, paymentId, 'fail', { failureCode, failureMessage });
  }
}
