import { prisma } from '@/libs/prisma'
import type { Prisma } from '@/prisma/client'
import Logger from '@/libs/logger'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './providers/base.provider'
import StripeProvider from './providers/stripe.provider'
import PaypalProvider from './providers/paypal.provider'
import IyzicoProvider from './providers/iyzico.provider'
import { PaymentProvider, PaymentCurrency } from './payment.enums'
import {
  SafePayment,
  SafePaymentSchema,
  PaymentTransaction,
  PaymentTransactionSchema,
  PaymentWithTransactions,
  PaymentWithTransactionsSchema,
} from './payment.types'
import {
  CreatePaymentDTO,
  UpdatePaymentDTO,
  GetPaymentsQuery,
  GetProviderStatusDTO,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  GetTransactionsQuery,
  RefundPaymentDTO,
} from './payment.dto'
import { PAYMENT_MESSAGES } from './payment.messages'

export default class PaymentService {
  // ============================================================================
  // Provider Management
  // ============================================================================

  private static readonly stripeProvider = new StripeProvider()
  private static readonly paypalProvider = new PaypalProvider()
  private static readonly iyzicoProvider = new IyzicoProvider()

  private static readonly PROVIDERS = new Map<PaymentProvider, BasePaymentProvider>([
    ['STRIPE', PaymentService.stripeProvider],
    ['PAYPAL', PaymentService.paypalProvider],
    ['IYZICO', PaymentService.iyzicoProvider],
  ])

  private static readonly DEFAULT_PROVIDER: PaymentProvider =
    (process.env.PAYMENT_DEFAULT_PROVIDER?.toUpperCase() as PaymentProvider) || 'STRIPE'

  private static getProvider(providerName?: PaymentProvider): BasePaymentProvider {
    const name = providerName || PaymentService.DEFAULT_PROVIDER
    const provider = PaymentService.PROVIDERS.get(name)

    if (!provider) {
      Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
      throw new Error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
    }

    return provider
  }

  static getAvailableProviders(): PaymentProvider[] {
    return Array.from(PaymentService.PROVIDERS.keys())
  }

  static getDefaultProvider(): PaymentProvider {
    return PaymentService.DEFAULT_PROVIDER
  }

  // ============================================================================
  // Payment CRUD Operations
  // ============================================================================

  static async create(data: CreatePaymentDTO): Promise<SafePayment> {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId: data.userId,
          tenantId: data.tenantId,
          provider: data.provider,
          amount: data.amount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          description: data.description,
          metadata: data.metadata as Prisma.JsonObject,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          billingAddress: data.billingAddress as Prisma.JsonObject,
          expiresAt: data.expiresAt,
          status: 'PENDING',
        },
      })

      return SafePaymentSchema.parse(payment)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED)
    }
  }

  static async getById(paymentId: string): Promise<SafePayment> {
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
    })

    if (!payment) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    return SafePaymentSchema.parse(payment)
  }

  static async getByIdWithTransactions(paymentId: string): Promise<PaymentWithTransactions> {
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
      include: { transactions: true },
    })

    if (!payment) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    return PaymentWithTransactionsSchema.parse(payment)
  }

  static async getAll(query: GetPaymentsQuery): Promise<{ payments: SafePayment[]; total: number }> {
    const { page, pageSize, userId, tenantId, provider, status, currency, fromDate, toDate } = query

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
    }

    if (userId) where.userId = userId
    if (tenantId) where.tenantId = tenantId
    if (provider) where.provider = provider
    if (status) where.status = status
    if (currency) where.currency = currency
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = fromDate
      if (toDate) where.createdAt.lte = toDate
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ])

    return {
      payments: payments.map((p) => SafePaymentSchema.parse(p)),
      total,
    }
  }

  static async update(paymentId: string, data: UpdatePaymentDTO): Promise<SafePayment> {
    const existing = await prisma.payment.findUnique({
      where: { paymentId },
    })

    if (!existing) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    try {
      const payment = await prisma.payment.update({
        where: { paymentId },
        data: {
          status: data.status,
          paymentMethod: data.paymentMethod,
          providerPaymentId: data.providerPaymentId,
          description: data.description,
          metadata: data.metadata as Prisma.JsonObject,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          billingAddress: data.billingAddress as Prisma.JsonObject,
          failureCode: data.failureCode,
          failureMessage: data.failureMessage,
          paidAt: data.status === 'COMPLETED' && !existing.paidAt ? new Date() : undefined,
          cancelledAt: data.status === 'CANCELLED' && !existing.cancelledAt ? new Date() : undefined,
        },
      })

      return SafePaymentSchema.parse(payment)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(PAYMENT_MESSAGES.PAYMENT_UPDATE_FAILED)
    }
  }

  static async delete(paymentId: string): Promise<void> {
    const existing = await prisma.payment.findUnique({
      where: { paymentId },
    })

    if (!existing) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    await prisma.payment.update({
      where: { paymentId },
      data: { deletedAt: new Date() },
    })
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  static async createTransaction(data: CreateTransactionDTO): Promise<PaymentTransaction> {
    const payment = await prisma.payment.findUnique({
      where: { paymentId: data.paymentId },
    })

    if (!payment) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    try {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          paymentId: data.paymentId,
          provider: data.provider,
          providerTransactionId: data.providerTransactionId,
          type: data.type,
          status: 'PENDING',
          amount: data.amount,
          currency: data.currency,
          fee: data.fee,
          net: data.net,
          providerResponse: data.providerResponse as Prisma.JsonObject,
          parentTransactionId: data.parentTransactionId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })

      return PaymentTransactionSchema.parse(transaction)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_CREATE_FAILED)
    }
  }

  static async getTransactionById(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId },
    })

    if (!transaction) {
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND)
    }

    return PaymentTransactionSchema.parse(transaction)
  }

  static async getTransactions(query: GetTransactionsQuery): Promise<{ transactions: PaymentTransaction[]; total: number }> {
    const { page, pageSize, paymentId, provider, type, status, fromDate, toDate } = query

    const where: Prisma.PaymentTransactionWhereInput = {}

    if (paymentId) where.paymentId = paymentId
    if (provider) where.provider = provider
    if (type) where.type = type
    if (status) where.status = status
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = fromDate
      if (toDate) where.createdAt.lte = toDate
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentTransaction.count({ where }),
    ])

    return {
      transactions: transactions.map((t) => PaymentTransactionSchema.parse(t)),
      total,
    }
  }

  static async updateTransaction(transactionId: string, data: UpdateTransactionDTO): Promise<PaymentTransaction> {
    const existing = await prisma.paymentTransaction.findUnique({
      where: { transactionId },
    })

    if (!existing) {
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_NOT_FOUND)
    }

    try {
      const transaction = await prisma.paymentTransaction.update({
        where: { transactionId },
        data: {
          status: data.status,
          providerTransactionId: data.providerTransactionId,
          fee: data.fee,
          net: data.net,
          providerResponse: data.providerResponse as Prisma.JsonObject,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
          processedAt: data.processedAt || (data.status === 'COMPLETED' ? new Date() : undefined),
        },
      })

      return PaymentTransactionSchema.parse(transaction)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(PAYMENT_MESSAGES.TRANSACTION_UPDATE_FAILED)
    }
  }

  // ============================================================================
  // Provider Operations
  // ============================================================================

  static async getProviderStatus(data: GetProviderStatusDTO): Promise<any> {
    const { token, provider } = data

    try {
      const paymentProvider = PaymentService.getProvider(provider)
      return await paymentProvider.getPaymentStatus(token)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  // ============================================================================
  // Checkout Session Operations
  // ============================================================================

  static async createCheckoutSession(
    provider: PaymentProvider,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const paymentProvider = PaymentService.getProvider(provider)
      return await paymentProvider.createCheckoutSession(params)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  // ============================================================================
  // Refund Operations
  // ============================================================================

  static async refund(data: RefundPaymentDTO): Promise<PaymentTransaction> {
    const payment = await prisma.payment.findUnique({
      where: { paymentId: data.paymentId },
    })

    if (!payment) {
      throw new Error(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND)
    }

    if (payment.status !== 'COMPLETED') {
      throw new Error(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED)
    }

    const refundAmount = data.amount || Number(payment.amount)
    const alreadyRefunded = Number(payment.refundedAmount) || 0
    const maxRefundable = Number(payment.amount) - alreadyRefunded

    if (refundAmount > maxRefundable) {
      throw new Error(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT)
    }

    // Create refund transaction
    const transaction = await PaymentService.createTransaction({
      paymentId: data.paymentId,
      provider: payment.provider as PaymentProvider,
      type: 'REFUND',
      amount: refundAmount,
      currency: payment.currency as PaymentCurrency,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })

    // Update payment refund amount and status
    const newRefundedAmount = alreadyRefunded + refundAmount
    const isFullyRefunded = newRefundedAmount >= Number(payment.amount)

    await prisma.payment.update({
      where: { paymentId: data.paymentId },
      data: {
        refundedAmount: newRefundedAmount,
        status: isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAt: isFullyRefunded ? new Date() : payment.refundedAt,
      },
    })

    return transaction
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async getPaymentsByUser(userId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentService.getAll({ userId, page, pageSize })
  }

  static async getPaymentsByTenant(tenantId: string, page = 0, pageSize = 10): Promise<{ payments: SafePayment[]; total: number }> {
    return PaymentService.getAll({ tenantId, page, pageSize })
  }

  static async markAsCompleted(paymentId: string, providerPaymentId?: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, {
      status: 'COMPLETED',
      providerPaymentId,
    })
  }

  static async markAsFailed(paymentId: string, failureCode?: string, failureMessage?: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, {
      status: 'FAILED',
      failureCode,
      failureMessage,
    })
  }

  static async markAsCancelled(paymentId: string): Promise<SafePayment> {
    return PaymentService.update(paymentId, {
      status: 'CANCELLED',
    })
  }
}
