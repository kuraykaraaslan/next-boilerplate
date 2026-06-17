import Logger from '@kuraykaraaslan/logger'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import redis from '@kuraykaraaslan/redis'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { Payment as PaymentEntity } from './entities/payment.entity'
import PaymentSellService from './payment_sell.service'
import { PAYMENT_SELL_MESSAGES } from './payment_sell.messages'
import type { NormalizedWebhookEvent } from '@kuraykaraaslan/payment_core/server/payment_core.types'
import type { PaymentProvider } from '@kuraykaraaslan/payment_core/server/payment_core.enums'

export default class PaymentSellWebhookService {

  static async handle(event: NormalizedWebhookEvent, provider: PaymentProvider): Promise<void> {
    try {
      const tenantId = event.tenantId
      if (!tenantId) {
        Logger.warn(`Webhook event missing tenantId — provider=${provider} action=${event.action}`)
        return
      }

      const ds = await tenantDataSourceFor(tenantId)
      const repo = ds.getRepository(PaymentEntity)
      const payment = await repo.findOne({ where: { providerPaymentId: event.providerPaymentId, tenantId } })

      if (!payment) {
        Logger.warn(`${PAYMENT_SELL_MESSAGES.WEBHOOK_PAYMENT_NOT_FOUND}: ${event.providerPaymentId}`)
        return
      }

      switch (event.action) {
        case 'payment.completed':
          await PaymentSellService.update(tenantId, payment.paymentId, { status: 'COMPLETED' })
          break

        case 'payment.failed':
          await PaymentSellService.update(tenantId, payment.paymentId, {
            status: 'FAILED',
            failureCode: event.failureCode,
            failureMessage: event.failureMessage,
          })
          break

        case 'payment.expired':
          await PaymentSellService.update(tenantId, payment.paymentId, { status: 'EXPIRED' })
          break

        case 'payment.refunded':
          await PaymentSellService.update(tenantId, payment.paymentId, { status: 'REFUNDED' })
          break

        default:
          Logger.debug(`PaymentSellWebhook: unhandled action=${event.action} for provider=${provider}`)
      }

      redis.del(`pay:sell:${payment.paymentId}`).catch(() => {})
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${PAYMENT_SELL_MESSAGES.WEBHOOK_PROCESSING_FAILED}: ${error}`)
      throw new AppError(PAYMENT_SELL_MESSAGES.WEBHOOK_PROCESSING_FAILED, 502, ErrorCode.INTERNAL_ERROR)
    }
  }
}
