import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'

export default class CloudPaymentsProvider extends BasePaymentProvider {
  readonly name = 'cloudpayments'

  private static readonly API_BASE = 'https://api.cloudpayments.ru'

  private static async getConfig(tenantId: string) {
    const [publicId, apiSecret] = await Promise.all([
      SettingService.getValue(tenantId, 'cloudpaymentsPublicId'),
      SettingService.getValue(tenantId, 'cloudpaymentsApiSecret'),
    ])
    if (!publicId || !apiSecret) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)
    return { publicId, apiSecret }
  }

  private async getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
    const { publicId, apiSecret } = await CloudPaymentsProvider.getConfig(tenantId)
    const credentials = Buffer.from(`${publicId}:${apiSecret}`).toString('base64')
    return axios.create({
      baseURL: CloudPaymentsProvider.API_BASE,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: CloudPaymentsProvider.API_BASE,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.post('/payments/find', { InvoiceId: token })
      const model = response.data?.Model
      return model?.Status || response.data?.Success
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.CLOUDPAYMENTS_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const invoiceId = params.metadata?.paymentId || `${Date.now()}`

      const body: Record<string, unknown> = {
        Amount: Number(params.amount.toFixed(2)),
        Currency: params.currency.toUpperCase(),
        Description: params.description,
        InvoiceId: invoiceId,
        AccountId: params.metadata?.userId || params.metadata?.tenantId || invoiceId,
        Email: params.metadata?.email,
        SuccessRedirectUrl: params.successUrl,
        FailRedirectUrl: params.cancelUrl,
        JsonData: params.metadata,
      }

      const response = await client.post('/orders/create', body)
      const model = response.data?.Model
      if (!response.data?.Success || !model) {
        throw new Error(response.data?.Message || 'CloudPayments order creation failed')
      }

      return {
        sessionId: model.Id || invoiceId,
        checkoutUrl: model.Url || '',
        providerData: { orderId: model.Id, invoiceId },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.CLOUDPAYMENTS_CREATE_PAYMENT_FAILED)
    }
  }
}
