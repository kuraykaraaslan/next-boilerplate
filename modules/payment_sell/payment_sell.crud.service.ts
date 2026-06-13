import 'reflect-metadata'
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import { env } from '@/modules/env'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import BasePaymentProvider from '@/modules/payment_core/providers/base.provider'
import StripeProvider from '@/modules/payment_core/providers/stripe.provider'
import PaypalProvider from '@/modules/payment_core/providers/paypal.provider'
import IyzicoProvider from '@/modules/payment_core/providers/iyzico.provider'
import AlipayProvider from '@/modules/payment_core/providers/alipay.provider'
import WeChatPayProvider from '@/modules/payment_core/providers/wechatpay.provider'
import YooKassaProvider from '@/modules/payment_core/providers/yookassa.provider'
import CloudPaymentsProvider from '@/modules/payment_core/providers/cloudpayments.provider'
import { Payment as PaymentEntity } from './entities/payment.entity'
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity'
import {
  SafePaymentSchema, PaymentTransactionSchema, PaymentWithTransactionsSchema,
  type SafePayment, type PaymentTransaction, type PaymentWithTransactions,
} from './payment_sell.types'
import type {
  UpdatePaymentDTO, GetPaymentsQuery,
  CreateTransactionDTO, GetTransactionsQuery,
} from './payment_sell.dto'
import { PAYMENT_SELL_MESSAGES } from './payment_sell.messages'
import type { PaymentProvider } from '@/modules/payment_core/payment_core.enums'
import PaymentSellInvoiceService from './payment_sell.invoice.service'

export default class PaymentSellCrudService {

  private static readonly stripeProvider = new StripeProvider()
  private static readonly paypalProvider = new PaypalProvider()
  private static readonly iyzicoProvider = new IyzicoProvider()
  private static readonly alipayProvider = new AlipayProvider()
  private static readonly wechatPayProvider = new WeChatPayProvider()
  private static readonly yookassaProvider = new YooKassaProvider()
  private static readonly cloudpaymentsProvider = new CloudPaymentsProvider()

  static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentSellCrudService.stripeProvider],
    ['PAYPAL', PaymentSellCrudService.paypalProvider],
    ['IYZICO', PaymentSellCrudService.iyzicoProvider],
    ['ALIPAY', PaymentSellCrudService.alipayProvider],
    ['WECHATPAY', PaymentSellCrudService.wechatPayProvider],
    ['YOOKASSA', PaymentSellCrudService.yookassaProvider],
    ['CLOUDPAYMENTS', PaymentSellCrudService.cloudpaymentsProvider],
  ])

  static getProvider(name: PaymentProvider): BasePaymentProvider {
    const p = PaymentSellCrudService.PROVIDERS.get(name)
    if (!p) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return p
  }

  // ──────────────────────────────────────────────
  // Payment CRUD
  // ──────────────────────────────────────────────

  static async getById(tenantId: string, paymentId: string): Promise<SafePayment> {
    return singleFlight(`pay:sell:${paymentId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(PaymentEntity).findOne({ where: { tenantId, paymentId } })
      if (!row) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      return SafePaymentSchema.parse(row)
    })
  }

  static async getWithTransactions(tenantId: string, paymentId: string): Promise<PaymentWithTransactions> {
    return singleFlight(`pay:sell:tx:${paymentId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const payment = await ds.getRepository(PaymentEntity).findOne({ where: { tenantId, paymentId } })
      if (!payment) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const transactions = await ds.getRepository(PaymentTransactionEntity).find({
        where: { paymentId },
        order: { createdAt: 'DESC' },
      })
      return PaymentWithTransactionsSchema.parse({ ...payment, transactions })
    })
  }

  static async list(tenantId: string, query: GetPaymentsQuery): Promise<{ data: SafePayment[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId
    if (query.provider) where['provider'] = query.provider
    if (query.status) where['status'] = query.status
    if (query.currency) where['currency'] = query.currency
    if (query.fromDate && query.toDate) where['createdAt'] = Between(query.fromDate, query.toDate)
    else if (query.fromDate) where['createdAt'] = MoreThanOrEqual(query.fromDate)
    else if (query.toDate) where['createdAt'] = LessThanOrEqual(query.toDate)
    const [rows, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafePaymentSchema.parse(r)), total }
  }

  static async update(tenantId: string, paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)
    const row = await repo.findOne({ where: { tenantId, paymentId } })
    if (!row) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const patch: UpdatePaymentDTO & { paidAt?: Date; cancelledAt?: Date; refundedAt?: Date } = { ...data }
    const firstCompletion = data.status === 'COMPLETED' && !row.paidAt
    if (firstCompletion) patch.paidAt = new Date()
    if (data.status === 'CANCELLED' && !row.cancelledAt) patch.cancelledAt = new Date()
    if (data.status === 'REFUNDED' && !row.refundedAt) patch.refundedAt = new Date()
    Object.assign(row, patch)
    const saved = await repo.save(row)

    // Auto-generate an invoice on first completion (best-effort, setting-gated).
    if (firstCompletion) {
      void PaymentSellInvoiceService.generateForPayment(tenantId, saved)
    }
    redis.del(`pay:sell:${paymentId}`).catch(() => {})
    redis.del(`pay:sell:tx:${paymentId}`).catch(() => {})
    if (data.status) {
      AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'payment.status_changed',
        resourceType: 'payment', resourceId: paymentId,
        metadata: { status: data.status },
      }).catch(() => {})
    }
    return SafePaymentSchema.parse(saved)
  }

  // ──────────────────────────────────────────────
  // Transactions
  // ──────────────────────────────────────────────

  static async createTransaction(tenantId: string, data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await tenantDataSourceFor(tenantId)
    const payment = await ds.getRepository(PaymentEntity).findOne({ where: { tenantId, paymentId: data.paymentId } })
    if (!payment) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(PaymentTransactionEntity)
    const tx = repo.create({ ...data })
    const saved = await repo.save(tx)
    redis.del(`pay:sell:tx:${data.paymentId}`).catch(() => {})
    return PaymentTransactionSchema.parse(saved)
  }

  static async listTransactions(
    tenantId: string, query: GetTransactionsQuery,
  ): Promise<{ data: PaymentTransaction[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    if (query.paymentId) {
      const payment = await ds.getRepository(PaymentEntity).findOne({
        where: { tenantId, paymentId: query.paymentId },
      })
      if (!payment) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }
    const where: Record<string, unknown> = {}
    if (query.paymentId) where['paymentId'] = query.paymentId
    if (query.type) where['type'] = query.type
    if (query.status) where['status'] = query.status
    const [rows, total] = await ds.getRepository(PaymentTransactionEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => PaymentTransactionSchema.parse(r)), total }
  }
}
