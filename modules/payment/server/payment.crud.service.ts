import 'reflect-metadata';
import { SafePayment, PaymentWithTransactions, PaymentTransaction } from './payment.types';
import {
  CreatePaymentDTO, UpdatePaymentDTO, GetPaymentsQuery, RefundPaymentDTO,
} from './payment.dto';
import PaymentTransactionService from './payment.transaction.service';
import { clearPaymentCache } from './payment.crud.helpers';
import {
  getById, getByIdWithTransactions, getAll, getPaymentsByUser, getPaymentsByTenant,
} from './payment.crud.read.service';
import {
  create, update, remove, markAsCompleted, markAsFailed, markAsCancelled,
} from './payment.crud.write.service';
import { refund, recordDispute, resolveDispute } from './payment.crud.dispute.service';

export { PaymentTransactionService };

/**
 * Payment CRUD service facade. The implementation is split across focused
 * modules (`payment.crud.read.service` reads + caching,
 * `payment.crud.write.service` create/update/delete/mark-*,
 * `payment.crud.dispute.service` refund + disputes, `payment.crud.helpers`
 * cache busting); this class preserves the single `PaymentCrudService.*` entry
 * point its callers (and `.bind(PaymentCrudService)` usage) depend on.
 */
export default class PaymentCrudService {
  static clearPaymentCache(paymentId: string): Promise<void> {
    return clearPaymentCache(paymentId);
  }

  static create(data: CreatePaymentDTO): Promise<SafePayment> {
    return create(data);
  }

  static getById(paymentId: string): Promise<SafePayment> {
    return getById(paymentId);
  }

  static getByIdWithTransactions(paymentId: string): Promise<PaymentWithTransactions> {
    return getByIdWithTransactions(paymentId);
  }

  static getAll(query: GetPaymentsQuery): Promise<{ payments: SafePayment[]; total: number }> {
    return getAll(query);
  }

  static update(paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
    return update(paymentId, data);
  }

  static delete(paymentId: string): Promise<void> {
    return remove(paymentId);
  }

  static getPaymentsByUser(userId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return getPaymentsByUser(userId, page, pageSize);
  }

  static getPaymentsByTenant(tenantId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return getPaymentsByTenant(tenantId, page, pageSize);
  }

  static markAsCompleted(paymentId: string, providerPaymentId?: string): Promise<SafePayment> {
    return markAsCompleted(paymentId, providerPaymentId);
  }

  static markAsFailed(paymentId: string, failureCode?: string, failureMessage?: string): Promise<SafePayment> {
    return markAsFailed(paymentId, failureCode, failureMessage);
  }

  static markAsCancelled(paymentId: string): Promise<SafePayment> {
    return markAsCancelled(paymentId);
  }

  static refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
    return refund(data);
  }

  static recordDispute(data: {
    paymentId: string;
    providerDisputeId?: string;
    reason?: string;
    amount?: number;
    status?: string;
  }): Promise<SafePayment> {
    return recordDispute(data);
  }

  static resolveDispute(paymentId: string, outcome: 'WON' | 'LOST'): Promise<SafePayment> {
    return resolveDispute(paymentId, outcome);
  }

  // Transaction delegates
  static createTransaction        = PaymentTransactionService.createTransaction.bind(PaymentTransactionService);
  static getTransactionById       = PaymentTransactionService.getTransactionById.bind(PaymentTransactionService);
  static getTransactions          = PaymentTransactionService.getTransactions.bind(PaymentTransactionService);
  static updateTransaction        = PaymentTransactionService.updateTransaction.bind(PaymentTransactionService);
}
