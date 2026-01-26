import Logger from '@/libs/logger'
import BasePaymentProvider from './providers/base.provider'
import StripeProvider from './providers/stripe.provider'
import PaypalProvider from './providers/paypal.provider'
import IyzicoProvider from './providers/iyzico.provider'
import { PaymentProviderType } from './payment.enums'
import { GetPaymentStatusDTO } from './payment.dto'
import { PAYMENT_MESSAGES } from './payment.messages'

export default class PaymentService {
  // Provider instances
  private static readonly stripeProvider = new StripeProvider()
  private static readonly paypalProvider = new PaypalProvider()
  private static readonly iyzicoProvider = new IyzicoProvider()

  // Provider name to instance mapping
  private static readonly PROVIDERS = new Map<PaymentProviderType, BasePaymentProvider>([
    ['stripe', PaymentService.stripeProvider],
    ['paypal', PaymentService.paypalProvider],
    ['iyzico', PaymentService.iyzicoProvider],
  ])

  // Default provider from env or fallback to stripe
  private static readonly DEFAULT_PROVIDER_NAME: PaymentProviderType =
    (process.env.PAYMENT_DEFAULT_PROVIDER as PaymentProviderType) || 'stripe'

  /**
   * Get a specific provider instance
   */
  private static getProvider(providerName?: PaymentProviderType): BasePaymentProvider {
    const name = providerName || PaymentService.DEFAULT_PROVIDER_NAME
    const provider = PaymentService.PROVIDERS.get(name)

    if (!provider) {
      Logger.error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
      throw new Error(`${PAYMENT_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
    }

    return provider
  }

  /**
   * Get payment status from provider
   * @param data - Get payment status data
   * @returns Payment status
   */
  static async getPaymentStatus(data: GetPaymentStatusDTO): Promise<any> {
    const { token, provider } = data

    try {
      const paymentProvider = PaymentService.getProvider(provider)
      return await paymentProvider.getPaymentStatus(token)
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.GET_STATUS_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): PaymentProviderType[] {
    return Array.from(PaymentService.PROVIDERS.keys())
  }

  /**
   * Get default provider name
   */
  static getDefaultProvider(): PaymentProviderType {
    return PaymentService.DEFAULT_PROVIDER_NAME
  }
}
