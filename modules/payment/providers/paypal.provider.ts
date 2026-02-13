import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'

export default class PaypalProvider extends BasePaymentProvider {
  readonly name = 'paypal'

  private static PAYPAL_ACCESS_TOKEN: string | null = null
  private static PAYPAL_ACCESS_TOKEN_EXPIRES: Date | null = null

  private static async getBaseUrl(): Promise<string> {
    const sandbox = await SettingService.getValue('paypalSandboxMode')
    return sandbox === 'true'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'
  }

  private static async getAccessToken(): Promise<string> {
    if (
      this.PAYPAL_ACCESS_TOKEN &&
      this.PAYPAL_ACCESS_TOKEN_EXPIRES &&
      this.PAYPAL_ACCESS_TOKEN_EXPIRES > new Date()
    ) {
      return this.PAYPAL_ACCESS_TOKEN
    }

    const clientId = await SettingService.getValue('paypalClientId')
    const clientSecret = await SettingService.getValue('paypalClientSecret')
    if (!clientId || !clientSecret) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)

    const baseUrl = await this.getBaseUrl()
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    try {
      const res = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      this.PAYPAL_ACCESS_TOKEN = res.data.access_token
      this.PAYPAL_ACCESS_TOKEN_EXPIRES = new Date(Date.now() + res.data.expires_in * 1000)
      return res.data.access_token
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.PAYPAL_ACCESS_TOKEN_FAILED)
    }
  }

  private async getAuthenticatedAxios(): Promise<AxiosInstance> {
    const baseUrl = await PaypalProvider.getBaseUrl()
    const token = await PaypalProvider.getAccessToken()
    return axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios()
      const response = await client.get(`/v2/checkout/orders/${token}`)
      return response.data
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.PAYPAL_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios()

      const body = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: params.currency.toUpperCase(),
            value: params.amount.toFixed(2),
          },
          description: params.description,
          custom_id: params.metadata?.paymentId,
        }],
        application_context: {
          return_url: params.successUrl,
          cancel_url: params.cancelUrl,
          brand_name: params.description,
          user_action: 'PAY_NOW',
        },
      }

      const response = await client.post('/v2/checkout/orders', body)
      const approveLink = response.data.links?.find((l: any) => l.rel === 'approve')

      return {
        sessionId: response.data.id,
        checkoutUrl: approveLink?.href || '',
        providerData: { orderId: response.data.id },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.PAYPAL_CREATE_ORDER_FAILED)
    }
  }
}
