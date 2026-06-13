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
import { PaymentCircuitBreaker } from '@/modules/payment_core'
import { RedisIdempotencyService } from '@/modules/redis_idempotency'

// Velocity guard: too many checkout attempts from one customer in a short
// window is a strong fraud / card-testing signal.
const VELOCITY_MAX = 10
const VELOCITY_WINDOW_SEC = 600 // 10 minutes

export default class PaymentSellCheckoutService {

  /** Reject card-testing / runaway checkout creation per customer (fraud guard). */
  private static async assertVelocity(tenantId: string, identifier: string): Promise<void> {
    const key = `pay:sell:velocity:${tenantId}:${identifier}`
    try {
      const n = await redis.incr(key)
      if (n === 1) await redis.expire(key, VELOCITY_WINDOW_SEC)
      if (n > VELOCITY_MAX) {
        throw new AppError(PAYMENT_SELL_MESSAGES.VELOCITY_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED)
      }
    } catch (err) {
      if (err instanceof AppError) throw err // velocity rejection propagates; Redis errors fail open
    }
  }

  static async createCheckout(tenantId: string, data: CreatePaymentDTO): Promise<CheckoutResult> {
    // Idempotency: a repeated submit with the same key returns the first result
    // instead of creating a second checkout session (double-charge guard).
    if (data.idempotencyKey) {
      const claim = await RedisIdempotencyService.acquire(tenantId, `pay:sell:${data.idempotencyKey}`)
      if (!claim.acquired && claim.existing?.status === 'completed' && claim.existing.response) {
        return CheckoutResultSchema.parse(claim.existing.response.body)
      }
    }

    // Fraud velocity guard, keyed by customer (email/user/phone) when available.
    const velocityId = data.customerEmail ?? data.userId ?? data.customerPhone
    if (velocityId) await this.assertVelocity(tenantId, velocityId)

    const provider = PaymentSellCrudService.getProvider(data.provider)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)

    let session: Awaited<ReturnType<typeof provider.createCheckoutSession>>
    try {
      // Circuit breaker: fail fast when this provider is in a failing state.
      session = await PaymentCircuitBreaker.run(data.provider, () => provider.createCheckoutSession(tenantId, {
        amount: data.amount,
        currency: data.currency,
        description: data.description ?? '',
        metadata: data.metadata as Record<string, string> | undefined,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      }))
    } catch (error) {
      if (error instanceof AppError) throw error
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

    const result = CheckoutResultSchema.parse({
      paymentId: saved.paymentId,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: data.provider,
      expiresAt: data.expiresAt ?? null,
    })

    // Record the idempotent result so a duplicate submit replays it.
    if (data.idempotencyKey) {
      await RedisIdempotencyService.setCompleted(tenantId, `pay:sell:${data.idempotencyKey}`, { body: result, statusCode: 200 }).catch(() => {})
    }

    return result
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
