import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'
import qs from 'querystring'

export default class StripeProvider extends BasePaymentProvider {
  readonly name = 'stripe'

  private static readonly STRIPE_API_URL = 'https://api.stripe.com/v1'

  private static async getSecretKey(): Promise<string> {
    const key = await SettingService.getValue('stripeSecretKey')
    if (!key) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)
    return key
  }

  private static cachedAxios: AxiosInstance | null = null

  private static initializeAxios(secretKey: string): AxiosInstance {
    return axios.create({
      baseURL: StripeProvider.STRIPE_API_URL,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    // Fallback for basic usage - will be overridden by dynamic key in methods
    if (!StripeProvider.cachedAxios) {
      StripeProvider.cachedAxios = axios.create({
        baseURL: StripeProvider.STRIPE_API_URL,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    }
    return StripeProvider.cachedAxios
  }

  private async getAuthenticatedAxios(): Promise<AxiosInstance> {
    const secretKey = await StripeProvider.getSecretKey()
    return StripeProvider.initializeAxios(secretKey)
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios()
      const response = await client.get(`/payment_intents/${token}`)
      return response.data.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.STRIPE_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios()

      const body: Record<string, any> = {
        'mode': 'payment',
        'line_items[0][price_data][currency]': params.currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': params.description,
        'line_items[0][price_data][unit_amount]': Math.round(params.amount * 100), // Stripe uses cents
        'line_items[0][quantity]': 1,
        'success_url': params.successUrl,
        'cancel_url': params.cancelUrl,
      }

      // Add metadata
      if (params.metadata) {
        for (const [key, value] of Object.entries(params.metadata)) {
          body[`metadata[${key}]`] = value
        }
      }

      const response = await client.post('/checkout/sessions', qs.stringify(body))

      return {
        sessionId: response.data.id,
        checkoutUrl: response.data.url,
        providerData: { sessionId: response.data.id },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.STRIPE_CREATE_INTENT_FAILED)
    }
  }
}
