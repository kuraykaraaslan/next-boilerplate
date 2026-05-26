import 'reflect-metadata'
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
import { getDataSource, tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { env } from '@/modules/env'
import BasePaymentProvider from '../payment_core/providers/base.provider'
import StripeProvider from '../payment_core/providers/stripe.provider'
import PaypalProvider from '../payment_core/providers/paypal.provider'
import IyzicoProvider from '../payment_core/providers/iyzico.provider'
import AlipayProvider from '../payment_core/providers/alipay.provider'
import WeChatPayProvider from '../payment_core/providers/wechatpay.provider'
import YooKassaProvider from '../payment_core/providers/yookassa.provider'
import CloudPaymentsProvider from '../payment_core/providers/cloudpayments.provider'
import { Payment as PaymentEntity } from './entities/payment.entity'
import { PaymentTransaction as PaymentTransactionEntity } from './entities/payment_transaction.entity'
import {
  SafePaymentSchema, PaymentTransactionSchema, PaymentWithTransactionsSchema,
  CheckoutResultSchema,
  type SafePayment, type PaymentTransaction, type PaymentWithTransactions, type CheckoutResult,
} from './payment_sell.types'
import type {
  CreatePaymentDTO, UpdatePaymentDTO, GetPaymentsQuery,
  RefundPaymentDTO, CreateTransactionDTO, GetTransactionsQuery,
} from './payment_sell.dto'
import { PAYMENT_SELL_MESSAGES } from './payment_sell.messages'
import type { PaymentProvider } from '../payment_core/payment_core.enums'

const CACHE_TTL = env.TENANT_CACHE_TTL ?? 300

export default class PaymentSellService {

  private static readonly stripeProvider = new StripeProvider()
  private static readonly paypalProvider = new PaypalProvider()
  private static readonly iyzicoProvider = new IyzicoProvider()
  private static readonly alipayProvider = new AlipayProvider()
  private static readonly wechatPayProvider = new WeChatPayProvider()
  private static readonly yookassaProvider = new YooKassaProvider()
  private static readonly cloudpaymentsProvider = new CloudPaymentsProvider()

  private static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentSellService.stripeProvider],
    ['PAYPAL', PaymentSellService.paypalProvider],
    ['IYZICO', PaymentSellService.iyzicoProvider],
    ['ALIPAY', PaymentSellService.alipayProvider],
    ['WECHATPAY', PaymentSellService.wechatPayProvider],
    ['YOOKASSA', PaymentSellService.yookassaProvider],
    ['CLOUDPAYMENTS', PaymentSellService.cloudpaymentsProvider],
  ])

  static getProvider(name: PaymentProvider): BasePaymentProvider {
    const p = PaymentSellService.PROVIDERS.get(name)
    if (!p) throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND)
    return p
  }

  // ============================================================================
  // Checkout
  // ============================================================================

  static async createCheckout(tenantId: string, data: CreatePaymentDTO): Promise<CheckoutResult> {
    const provider = PaymentSellService.getProvider(data.provider)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)

    let session: Awaited<ReturnType<typeof provider.createCheckoutSession>>
    try {
      session = await provider.createCheckoutSession(tenantId, {
        amount: data.amount,
        currency: data.currency,
        description: data.description ?? '',
        metadata: data.metadata as Record<string, string> | undefined,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      })
    } catch (error) {
      Logger.error(`${PAYMENT_SELL_MESSAGES.CHECKOUT_CREATE_FAILED}: ${error}`)
      throw new Error(PAYMENT_SELL_MESSAGES.CHECKOUT_CREATE_FAILED)
    }

    const payment = repo.create({
      tenantId,
      userId: data.userId,
      provider: data.provider,
      providerPaymentId: session.sessionId,
      amount: data.amount,
      currency: data.currency,
      status: 'PENDING',
      paymentMethod: data.paymentMethod,
      description: data.description,
      metadata: data.metadata,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      billingAddress: data.billingAddress,
      expiresAt: data.expiresAt,
    })
    const saved = await repo.save(payment)

    return CheckoutResultSchema.parse({
      paymentId: saved.paymentId,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: data.provider,
      expiresAt: data.expiresAt ?? null,
    })
  }

  // ============================================================================
  // Payment CRUD
  // ============================================================================

  static async getById(tenantId: string, paymentId: string): Promise<SafePayment> {
    return singleFlight(`pay:sell:${paymentId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(PaymentEntity).findOne({ where: { tenantId, paymentId } })
      if (!row) throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND)
      return SafePaymentSchema.parse(row)
    })
  }

  static async getWithTransactions(tenantId: string, paymentId: string): Promise<PaymentWithTransactions> {
    return singleFlight(`pay:sell:tx:${paymentId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const payment = await ds.getRepository(PaymentEntity).findOne({ where: { tenantId, paymentId } })
      if (!payment) throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND)
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
    if (!row) throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND)

    if (data.status === 'COMPLETED' && !row.paidAt) (data as any).paidAt = new Date()
    if (data.status === 'CANCELLED' && !row.cancelledAt) (data as any).cancelledAt = new Date()
    if (data.status === 'REFUNDED' && !row.refundedAt) (data as any).refundedAt = new Date()

    Object.assign(row, data)
    const saved = await repo.save(row)
    await redis.del(`pay:sell:${paymentId}`)
    await redis.del(`pay:sell:tx:${paymentId}`)
    return SafePaymentSchema.parse(saved)
  }

  // ============================================================================
  // Refund
  // ============================================================================

  static async refund(tenantId: string, paymentId: string, dto: RefundPaymentDTO): Promise<SafePayment> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)
    const payment = await repo.findOne({ where: { tenantId, paymentId } })
    if (!payment) throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND)
    if (!['COMPLETED', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      throw new Error(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_REFUNDABLE)
    }

    const refundAmount = dto.amount ?? payment.amount
    const alreadyRefunded = Number(payment.refundedAmount ?? 0)
    if (refundAmount + alreadyRefunded > payment.amount) {
      throw new Error(PAYMENT_SELL_MESSAGES.INVALID_REFUND_AMOUNT)
    }

    try {
      const provider = PaymentSellService.getProvider(payment.provider as PaymentProvider)
      // Providers that support refunds expose refundPayment; otherwise skip
      if ('refundPayment' in provider && typeof (provider as any).refundPayment === 'function') {
        await (provider as any).refundPayment(tenantId, payment.providerPaymentId!, refundAmount)
      }
    } catch (error) {
      Logger.error(`${PAYMENT_SELL_MESSAGES.REFUND_FAILED}: ${error}`)
      throw new Error(PAYMENT_SELL_MESSAGES.REFUND_FAILED)
    }

    const newRefunded = alreadyRefunded + refundAmount
    const isFullRefund = newRefunded >= payment.amount
    payment.refundedAmount = newRefunded
    payment.status = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    if (isFullRefund) payment.refundedAt = new Date()
    const saved = await repo.save(payment)
    await redis.del(`pay:sell:${paymentId}`)
    return SafePaymentSchema.parse(saved)
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  static async createTransaction(tenantId: string, data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentTransactionEntity)
    const tx = repo.create({ ...data })
    const saved = await repo.save(tx)
    await redis.del(`pay:sell:tx:${data.paymentId}`)
    return PaymentTransactionSchema.parse(saved)
  }

  static async listTransactions(
    tenantId: string, query: GetTransactionsQuery,
  ): Promise<{ data: PaymentTransaction[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
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

  // ============================================================================
  // Provider status
  // ============================================================================

  static async getProviderStatus(tenantId: string, token: string, provider: PaymentProvider): Promise<unknown> {
    try {
      return await PaymentSellService.getProvider(provider).getPaymentStatus(tenantId, token)
    } catch (error) {
      Logger.error(`${PAYMENT_SELL_MESSAGES.STATUS_FETCH_FAILED}: ${error}`)
      throw new Error(PAYMENT_SELL_MESSAGES.STATUS_FETCH_FAILED)
    }
  }

  static async getCustomerPortal(
    tenantId: string,
    provider: PaymentProvider,
    customerExternalId?: string,
    customerEmail?: string,
    returnUrl?: string,
  ) {
    return PaymentSellService.getProvider(provider).createCustomerPortalSession(tenantId, {
      customerExternalId,
      customerEmail,
      returnUrl: returnUrl ?? '/',
    })
  }
}
