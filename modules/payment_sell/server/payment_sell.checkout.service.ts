import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import redis from '@kuraykaraaslan/redis'
import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import { Payment as PaymentEntity } from './entities/payment.entity'
import {
  SafePaymentSchema, CheckoutResultSchema,
  type SafePayment, type CheckoutResult,
} from './payment_sell.types'
import type { CreatePaymentDTO, RefundPaymentDTO } from './payment_sell.dto'
import { PAYMENT_SELL_MESSAGES } from './payment_sell.messages'
import PaymentSellCrudService from './payment_sell.crud.service'
import type { PaymentProvider } from '@kuraykaraaslan/payment_core/server/payment_core.enums'
import { PaymentCircuitBreaker } from '@kuraykaraaslan/payment_core'
import type BasePaymentProvider from '@kuraykaraaslan/payment_core/server/providers/base.provider'
import { RedisIdempotencyService } from '@kuraykaraaslan/redis_idempotency'

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

  // Provider → its per-tenant "enabled" setting flag.
  private static readonly PROVIDER_ENABLED_KEY: Record<PaymentProvider, string> = {
    STRIPE: 'stripeEnabled', PAYPAL: 'paypalEnabled', IYZICO: 'iyzicoEnabled',
    ALIPAY: 'alipayEnabled', WECHATPAY: 'wechatPayEnabled',
    YOOKASSA: 'yookassaEnabled', CLOUDPAYMENTS: 'cloudpaymentsEnabled',
  }

  /**
   * Smart routing: build an ordered fallback chain starting with the preferred
   * provider, then any other per-tenant enabled providers. Providers whose
   * circuit breaker is open are pushed to the back so a failing gateway is tried
   * last (or skipped). Only enabled providers are included.
   */
  private static async resolveProviderChain(tenantId: string, preferred: PaymentProvider): Promise<PaymentProvider[]> {
    const all = Object.keys(this.PROVIDER_ENABLED_KEY) as PaymentProvider[]
    const enabled: PaymentProvider[] = []
    for (const p of all) {
      const on = await SettingService.getValue(tenantId, this.PROVIDER_ENABLED_KEY[p]).catch(() => null)
      if (on === 'true') enabled.push(p)
    }
    // If the tenant configured nothing, honour the explicit request.
    const pool = enabled.length > 0 ? enabled : [preferred]
    const ordered = [preferred, ...pool.filter((p) => p !== preferred)]
    // Healthy first, open-breaker providers last.
    const healthy: PaymentProvider[] = []
    const degraded: PaymentProvider[] = []
    for (const p of ordered) {
      (await PaymentCircuitBreaker.isOpen(p)) ? degraded.push(p) : healthy.push(p)
    }
    return [...healthy, ...degraded]
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

    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PaymentEntity)

    // Smart routing: try the preferred provider, then enabled fallbacks; skip /
    // defer providers whose circuit breaker is open.
    const chain = await this.resolveProviderChain(tenantId, data.provider)
    let session: Awaited<ReturnType<BasePaymentProvider['createCheckoutSession']>> | undefined
    let usedProvider: PaymentProvider = data.provider
    let lastError: unknown
    for (const p of chain) {
      try {
        const provider = PaymentSellCrudService.getProvider(p)
        session = await PaymentCircuitBreaker.run(p, () => provider.createCheckoutSession(tenantId, {
          amount: data.amount,
          currency: data.currency,
          description: data.description ?? '',
          metadata: data.metadata as Record<string, string> | undefined,
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
        }))
        usedProvider = p
        break
      } catch (error) {
        lastError = error
        Logger.warn(`[payment_sell] provider ${p} failed, trying next in chain: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (!session) {
      Logger.error(`${PAYMENT_SELL_MESSAGES.CHECKOUT_CREATE_FAILED}: ${lastError}`)
      throw new AppError(PAYMENT_SELL_MESSAGES.NO_PROVIDER_AVAILABLE, 502, ErrorCode.INTERNAL_ERROR)
    }

    const payment = repo.create({
      tenantId, userId: data.userId,
      provider: usedProvider, providerPaymentId: session.sessionId,
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
      metadata: { provider: usedProvider, requestedProvider: data.provider, amount: data.amount, currency: data.currency },
    }).catch(() => {})

    const result = CheckoutResultSchema.parse({
      paymentId: saved.paymentId,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: usedProvider,
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
    // Per-tenant refund window: reject refunds past `refundWindowDays` from
    // the paid date (0 / unset = no limit).
    const windowRaw = await SettingService.getValue(tenantId, 'refundWindowDays').catch(() => null)
    const windowDays = windowRaw ? parseInt(windowRaw, 10) : 0
    if (windowDays > 0 && payment.paidAt) {
      const ageDays = (Date.now() - new Date(payment.paidAt).getTime()) / 86_400_000
      if (ageDays > windowDays) {
        throw new AppError(PAYMENT_SELL_MESSAGES.REFUND_WINDOW_EXPIRED, 409, ErrorCode.CONFLICT)
      }
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
