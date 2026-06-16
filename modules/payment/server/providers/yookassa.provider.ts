import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult, WalletDescriptor } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@nb/setting/server/setting.service'

export default class YooKassaProvider extends BasePaymentProvider {
  readonly name = 'yookassa'

  override get supportedWallets(): WalletDescriptor[] {
    return [
      { method: 'CARD', delivery: 'HOSTED_REDIRECT' },
      { method: 'YOOMONEY', delivery: 'HOSTED_REDIRECT' },
      { method: 'SBP', delivery: 'HOSTED_REDIRECT' },
    ]
  }

  private static readonly API_BASE = 'https://api.yookassa.ru/v3'

  private static async getConfig(tenantId: string) {
    const [shopId, secretKey] = await Promise.all([
      SettingService.getValue(tenantId, 'yookassaShopId'),
      SettingService.getValue(tenantId, 'yookassaSecretKey'),
    ])
    if (!shopId || !secretKey) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)
    return { shopId, secretKey }
  }

  private async getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
    const { shopId, secretKey } = await YooKassaProvider.getConfig(tenantId)
    const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64')
    return axios.create({
      baseURL: YooKassaProvider.API_BASE,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: YooKassaProvider.API_BASE,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.get(`/payments/${encodeURIComponent(token)}`)
      return response.data?.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.YOOKASSA_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const idempotenceKey = params.metadata?.paymentId || crypto.randomUUID()

      const body: Record<string, unknown> = {
        amount: {
          value: params.amount.toFixed(2),
          currency: params.currency.toUpperCase(),
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: params.successUrl,
        },
        description: params.description,
        metadata: params.metadata,
      }

      const response = await client.post('/payments', body, {
        headers: { 'Idempotence-Key': idempotenceKey },
      })

      return {
        sessionId: response.data.id,
        checkoutUrl: response.data.confirmation?.confirmation_url || '',
        providerData: { paymentId: response.data.id, status: response.data.status },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.YOOKASSA_CREATE_PAYMENT_FAILED)
    }
  }
}
