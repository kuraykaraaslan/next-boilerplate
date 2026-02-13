import CryptoJS from 'crypto-js'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'

export default class IyzicoProvider extends BasePaymentProvider {
  readonly name = 'iyzico'

  private static async getConfig() {
    const [apiKey, secretKey, sandbox] = await Promise.all([
      SettingService.getValue('iyzicoApiKey'),
      SettingService.getValue('iyzicoSecretKey'),
      SettingService.getValue('iyzicoSandboxMode'),
    ])
    if (!apiKey || !secretKey) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)

    const baseUrl = sandbox === 'true'
      ? 'https://sandbox-api.iyzipay.com'
      : 'https://api.iyzipay.com'

    return { apiKey, secretKey, baseUrl }
  }

  private static generateAuthorizationString(
    apiKey: string,
    secretKey: string,
    payload: string,
    uriPath: string
  ): { authorization: string; 'x-iyzi-rnd': string } {
    const randomKey = `${Date.now()}123456789`
    const fullPayload = randomKey + uriPath + payload
    const signature = CryptoJS.HmacSHA256(fullPayload, secretKey).toString()
    const authStr = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
    const encoded = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authStr))

    return {
      authorization: `IYZWSv2 ${encoded}`,
      'x-iyzi-rnd': randomKey,
    }
  }

  private async getAuthenticatedAxios(): Promise<AxiosInstance> {
    const config = await IyzicoProvider.getConfig()
    const client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    client.interceptors.request.use((reqConfig) => {
      const uriPath = reqConfig.url!
      const payload = reqConfig.data ? JSON.stringify(reqConfig.data) : ''
      const auth = IyzicoProvider.generateAuthorizationString(config.apiKey, config.secretKey, payload, uriPath)
      reqConfig.headers['authorization'] = auth.authorization
      reqConfig.headers['x-iyzi-rnd'] = auth['x-iyzi-rnd']
      return reqConfig
    })

    return client
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios()
      const path = '/payment/iyzipos/checkoutform/auth/ecom/detail'

      const response = await client.post(path, {
        locale: 'tr',
        conversationId: token,
        token,
      })
      return response.data.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.IYZICO_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios()
      const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

      const conversationId = params.metadata?.paymentId || `${Date.now()}`
      const body = {
        locale: 'tr',
        conversationId,
        price: params.amount.toFixed(2),
        paidPrice: params.amount.toFixed(2),
        currency: params.currency.toUpperCase() === 'TRY' ? 'TRY' : 'USD',
        basketId: conversationId,
        paymentGroup: 'SUBSCRIPTION',
        callbackUrl: params.successUrl,
        buyer: {
          id: params.metadata?.tenantId || 'BUYER',
          name: 'Tenant',
          surname: 'Admin',
          email: params.metadata?.email || 'buyer@example.com',
          identityNumber: '00000000000',
          registrationAddress: 'N/A',
          city: 'Istanbul',
          country: 'Turkey',
          ip: '127.0.0.1',
        },
        shippingAddress: {
          contactName: 'Tenant Admin',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'N/A',
        },
        billingAddress: {
          contactName: 'Tenant Admin',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'N/A',
        },
        basketItems: [{
          id: params.metadata?.planId || 'PLAN',
          name: params.description,
          category1: 'Subscription',
          itemType: 'VIRTUAL',
          price: params.amount.toFixed(2),
        }],
      }

      const response = await client.post(path, body)

      return {
        sessionId: response.data.token || conversationId,
        checkoutUrl: response.data.paymentPageUrl || response.data.checkoutFormContent || '',
        providerData: { token: response.data.token },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.IYZICO_CREATE_PAYMENT_FAILED)
    }
  }
}
