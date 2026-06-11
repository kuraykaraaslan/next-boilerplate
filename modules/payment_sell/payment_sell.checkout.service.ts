import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { Payment as PaymentEntity } from './entities/payment.entity'
import {
  SafePaymentSchema, CheckoutResultSchema,
  type SafePayment, type CheckoutResult,
} from './payment_sell.types'
import type { CreatePaymentDTO, RefundPaymentDTO } from './payment_sell.dto'
import { PAYMENT_SELL_MESSAGES } from './payment_sell.messages'
import PaymentSellCrudService from './payment_sell.crud.service'
import type { PaymentProvider } from '@/modules/payment_core/payment_core.enums'

export default class PaymentSellCheckoutService {

  static async createCheckout(tenantId: string, data: CreatePaymentDTO): Promise<CheckoutResult> {
    const provider = PaymentSellCrudService.getProvider(data.provider)
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
      throw new AppError(PAYMENT_SELL_MESSAGES.CHECKOUT_CREATE_FAILED, 502, ErrorCode.INTERNAL_ERROR)
    }

    const payment = repo.create({
      tenantId, userId: data.userId,
      provider: data.provider, providerPaymentId: session.sessionId,
      amount: data.amount, currency: data.currency,
      status: 'PENDING', paymentMethod: data.paymentMethod,
      description: data.description, metadata: data.metadata,
      customerEmail: data.customerEmail, customerName: data.customerName,
      customerPhone: data.customerPhone, billingAddress: data.billingAddress,
      expiresAt: data.expiresAt,
    })
    const saved = await repo.save(payment)

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'payment.checkout_created',
      resourceType: 'payment', resourceId: saved.paymentId,
      metadata: { provider: data.provider, amount: data.amount, currency: data.currency },
    }).catch(() => {})

    return CheckoutResultSchema.parse({
      paymentId: saved.paymentId,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: data.provider,
      expiresAt: data.expiresAt ?? null,
    })
  }

  static async refund(tenantId: string, paymentId: string, dto: RefundPaymentDTO): Promise<SafePayment> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)
    const payment = await repo.findOne({ where: { tenantId, paymentId } })
    if (!payment) throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!['COMPLETED', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      throw new AppError(PAYMENT_SELL_MESSAGES.PAYMENT_NOT_REFUNDABLE, 409, ErrorCode.CONFLICT)
    }
    const refundAmount = dto.amount ?? payment.amount
    const alreadyRefunded = Number(payment.refundedAmount ?? 0)
    if (refundAmount + alreadyRefunded > payment.amount) {
      throw new AppError(PAYMENT_SELL_MESSAGES.INVALID_REFUND_AMOUNT, 422, ErrorCode.VALIDATION_ERROR)
    }
    try {
      const provider = PaymentSellCrudService.getProvider(payment.provider as PaymentProvider)
      if ('refundPayment' in provider && typeof (provider as any).refundPayment === 'function') {
        await (provider as any).refundPayment(tenantId, payment.providerPaymentId!, refundAmount)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${PAYMENT_SELL_MESSAGES.REFUND_FAILED}: ${error}`)
      throw new AppError(PAYMENT_SELL_MESSAGES.REFUND_FAILED, 502, ErrorCode.INTERNAL_ERROR)
    }
    const newRefunded = alreadyRefunded + refundAmount
    const isFullRefund = newRefunded >= payment.amount
    payment.refundedAmount = newRefunded
    payment.status = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    if (isFullRefund) payment.refundedAt = new Date()
    const saved = await repo.save(payment)
    redis.del(`pay:sell:${paymentId}`).catch(() => {})
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'payment.refunded',
      resourceType: 'payment', resourceId: paymentId,
      metadata: { refundAmount, isFullRefund },
    }).catch(() => {})
    return SafePaymentSchema.parse(saved)
  }

  static async getProviderStatus(tenantId: string, token: string, provider: PaymentProvider): Promise<unknown> {
    try {
      return await PaymentSellCrudService.getProvider(provider).getPaymentStatus(tenantId, token)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${PAYMENT_SELL_MESSAGES.STATUS_FETCH_FAILED}: ${error}`)
      throw new AppError(PAYMENT_SELL_MESSAGES.STATUS_FETCH_FAILED, 502, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async getCustomerPortal(
    tenantId: string,
    provider: PaymentProvider,
    customerExternalId?: string,
    customerEmail?: string,
    returnUrl?: string,
  ) {
    return PaymentSellCrudService.getProvider(provider).createCustomerPortalSession(tenantId, {
      customerExternalId, customerEmail,
      returnUrl: returnUrl ?? '/',
    })
  }
}
