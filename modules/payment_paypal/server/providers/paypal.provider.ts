import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult, WalletDescriptor } from '@nb/payment/server/providers/base.provider'
import { PAYMENT_MESSAGES } from '@nb/payment/server/payment.messages'
import SettingService from '@nb/setting/server/setting.service'

interface CachedToken {
  token: string
  expiresAt: Date
}

export default class PaypalProvider extends BasePaymentProvider {
  readonly name = 'paypal'

  override get supportedWallets(): WalletDescriptor[] {
    return [{ method: 'PAYPAL', delivery: 'HOSTED_REDIRECT' }]
  }

  // Per-tenant token cache. Provider instance is a singleton; each tenant
  // has its own PayPal credentials so the cache must be keyed by tenantId.
  private static readonly TOKEN_CACHE = new Map<string, CachedToken>()

  private static async getBaseUrl(tenantId: string): Promise<string> {
    const sandbox = await SettingService.getValue(tenantId, 'paypalSandboxMode')
    return sandbox === 'true'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'
  }

  private static async getAccessToken(tenantId: string): Promise<string> {
    const cached = PaypalProvider.TOKEN_CACHE.get(tenantId)
    if (cached && cached.expiresAt > new Date()) {
      return cached.token
    }

    const clientId = await SettingService.getValue(tenantId, 'paypalClientId')
    const clientSecret = await SettingService.getValue(tenantId, 'paypalClientSecret')
    if (!clientId || !clientSecret) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)

    const baseUrl = await PaypalProvider.getBaseUrl(tenantId)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    try {
      const res = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      PaypalProvider.TOKEN_CACHE.set(tenantId, {
        token: res.data.access_token,
        expiresAt: new Date(Date.now() + res.data.expires_in * 1000),
      })
      return res.data.access_token
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.PAYPAL_ACCESS_TOKEN_FAILED)
    }
  }

  private async getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
    const baseUrl = await PaypalProvider.getBaseUrl(tenantId)
    const token = await PaypalProvider.getAccessToken(tenantId)
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

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.get(`/v2/checkout/orders/${token}`)
      return response.data
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.PAYPAL_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)

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
