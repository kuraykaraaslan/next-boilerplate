import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'
import qs from 'querystring'

export default class StripeProvider extends BasePaymentProvider {
  readonly name = 'stripe'

  private static readonly STRIPE_API_URL = 'https://api.stripe.com/v1'

  /**
   * Tenant-scoped Stripe secret key.
   * Each tenant brings its own Stripe API key via Setting.
   */
  private static async getSecretKey(tenantId: string): Promise<string> {
    const key = await SettingService.getValue(tenantId, 'stripeSecretKey')
    if (!key) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)
    return key
  }

  private static buildAuthenticatedAxios(secretKey: string): AxiosInstance {
    return axios.create({
      baseURL: StripeProvider.STRIPE_API_URL,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    // Unauthenticated fallback only — actual calls go through
    // getAuthenticatedAxios(tenantId).
    return axios.create({
      baseURL: StripeProvider.STRIPE_API_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  }

  private async getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
    const secretKey = await StripeProvider.getSecretKey(tenantId)
    return StripeProvider.buildAuthenticatedAxios(secretKey)
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.get(`/payment_intents/${token}`)
      return response.data.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.STRIPE_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)

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
