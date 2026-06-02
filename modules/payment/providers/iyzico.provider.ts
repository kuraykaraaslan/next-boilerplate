import CryptoJS from 'crypto-js'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, {
  CheckoutSessionParams,
  CheckoutSessionResult,
  DirectChargeParams,
  DirectChargeResult,
  ProviderBinInfo,
  ThreeDSInitParams,
  ThreeDSInitResult,
  ThreeDSCompleteParams,
  WalletDescriptor,
} from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'
import Logger from '@/modules/logger'

export default class IyzicoProvider extends BasePaymentProvider {
  readonly name = 'iyzico'

  private static async getConfig(tenantId: string) {
    const [apiKey, secretKey, sandbox] = await Promise.all([
      SettingService.getValue(tenantId, 'iyzicoApiKey'),
      SettingService.getValue(tenantId, 'iyzicoSecretKey'),
      SettingService.getValue(tenantId, 'iyzicoSandboxMode'),
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

  private async getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
    const config = await IyzicoProvider.getConfig(tenantId)
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

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
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

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

      const conversationId = params.metadata?.paymentId || `${Date.now()}`
      // Optional installment scoping for the hosted form. MasterPass / BKM Express
      // still appear when enabled in the iyzico merchant panel — no code needed.
      // e.g. setting "1,2,3,6,9" → [1,2,3,6,9].
      const installmentsRaw = await SettingService.getValue(tenantId, 'iyzicoEnabledInstallments').catch(() => null)
      const enabledInstallments = (installmentsRaw || '')
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
      const body = {
        locale: 'tr',
        conversationId,
        price: params.amount.toFixed(2),
        paidPrice: params.amount.toFixed(2),
        currency: params.currency.toUpperCase() === 'TRY' ? 'TRY' : 'USD',
        basketId: conversationId,
        paymentGroup: 'SUBSCRIPTION',
        ...(enabledInstallments.length ? { enabledInstallments } : {}),
        callbackUrl: params.successUrl,
        buyer: {
          id: params.metadata?.tenantId || tenantId,
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

  /** Iyzico collects the card on our own form, so direct (non-3DS) charging is supported. */
  override get supportsDirectCardPayment(): boolean {
    return true
  }

  /** Iyzico supports the standard 3DS flow (initialize → bank → callback → auth). */
  override get supports3dsCardPayment(): boolean {
    return true
  }

  /** Wallets surfaced on iyzico's hosted CheckoutForm (enable each in the iyzico panel). */
  override get supportedWallets(): WalletDescriptor[] {
    return [
      { method: 'CARD', delivery: 'HOSTED_REDIRECT' },
      { method: 'MASTERPASS', delivery: 'HOSTED_REDIRECT' },
      { method: 'BKM_EXPRESS', delivery: 'HOSTED_REDIRECT' },
      { method: 'SAVED_CARD', delivery: 'HOSTED_REDIRECT' },
      { method: 'INSTALLMENT', delivery: 'HOSTED_REDIRECT' },
    ]
  }

  /**
   * Shared `/payment/auth` + `/payment/3dsecure/initialize` request body. iyzico
   * requires `price` to equal the sum of basket-item prices, so we send a single
   * basket item equal to `amount`. Card data is never persisted/logged.
   */
  private buildChargeBody(tenantId: string, params: DirectChargeParams, conversationId: string) {
    const expireYear = params.card.expireYear.length === 2
      ? `20${params.card.expireYear}`
      : params.card.expireYear

    const name = params.buyer?.name || 'Tenant'
    const surname = params.buyer?.surname || 'Admin'
    const contactName = `${name} ${surname}`.trim()
    const basketItems = (params.basketItems && params.basketItems.length > 0
      ? params.basketItems
      : [{ id: 'ITEM', name: params.description, price: params.amount }]
    ).map((b) => ({
      id: b.id,
      name: b.name,
      category1: 'Subscription',
      itemType: 'VIRTUAL',
      price: b.price.toFixed(2),
    }))

    return {
      locale: 'tr',
      conversationId,
      price: params.amount.toFixed(2),
      paidPrice: params.amount.toFixed(2),
      currency: params.currency.toUpperCase(),
      installment: 1,
      basketId: conversationId,
      paymentChannel: 'WEB',
      paymentGroup: 'SUBSCRIPTION',
      paymentCard: {
        cardHolderName: params.card.cardHolderName,
        cardNumber: params.card.cardNumber,
        expireMonth: params.card.expireMonth,
        expireYear,
        cvc: params.card.cvc,
        registerCard: 0,
      },
      buyer: {
        id: params.buyer?.id || tenantId,
        name,
        surname,
        email: params.buyer?.email || 'buyer@example.com',
        identityNumber: params.buyer?.identityNumber || '11111111111',
        registrationAddress: 'N/A',
        city: 'Istanbul',
        country: 'Turkey',
        ip: params.buyer?.ip || '127.0.0.1',
      },
      shippingAddress: { contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
      billingAddress: { contactName, city: 'Istanbul', country: 'Turkey', address: 'N/A' },
      basketItems,
    }
  }

  /**
   * Non-3DS direct charge via `/payment/auth`.
   */
  override async createPayment(tenantId: string, params: DirectChargeParams): Promise<DirectChargeResult> {
    const conversationId = params.metadata?.paymentId || `${Date.now()}`
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.post('/payment/auth', this.buildChargeBody(tenantId, params, conversationId))
      const data = response.data || {}

      if (data.status === 'success') {
        return { status: 'success', providerPaymentId: data.paymentId, raw: data }
      }
      return {
        status: 'failure',
        errorCode: data.errorCode,
        errorMessage: data.errorMessage || PAYMENT_MESSAGES.IYZICO_PAYMENT_DECLINED,
        raw: data,
      }
    } catch (error) {
      // Card data is never included in the logged message.
      Logger.error(`${PAYMENT_MESSAGES.IYZICO_DIRECT_PAYMENT_FAILED} (conv ${conversationId}): ${error instanceof Error ? error.message : String(error)}`)
      return {
        status: 'failure',
        errorMessage: PAYMENT_MESSAGES.IYZICO_DIRECT_PAYMENT_FAILED,
      }
    }
  }

  /**
   * Start a 3DS charge via `/payment/3dsecure/initialize`. Returns iyzico's
   * `threeDSHtmlContent` (base64, self-submitting form) which the browser renders
   * to reach the bank's 3DS page. The bank then POSTs to `params.callbackUrl`.
   */
  override async create3dsPayment(tenantId: string, params: ThreeDSInitParams): Promise<ThreeDSInitResult> {
    const conversationId = params.metadata?.paymentId || `${Date.now()}`
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const body = { ...this.buildChargeBody(tenantId, params, conversationId), callbackUrl: params.callbackUrl }
      const response = await client.post('/payment/3dsecure/initialize', body)
      const data = response.data || {}

      if (data.status === 'success' && data.threeDSHtmlContent) {
        return { status: 'success', htmlContent: data.threeDSHtmlContent, conversationId, raw: data }
      }
      return {
        status: 'failure',
        errorCode: data.errorCode,
        errorMessage: data.errorMessage || PAYMENT_MESSAGES.IYZICO_PAYMENT_DECLINED,
        raw: data,
      }
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.IYZICO_3DS_INIT_FAILED} (conv ${conversationId}): ${error instanceof Error ? error.message : String(error)}`)
      return { status: 'failure', errorMessage: PAYMENT_MESSAGES.IYZICO_3DS_INIT_FAILED }
    }
  }

  /** Finalize a 3DS charge via `/payment/3dsecure/auth` after the bank callback. */
  override async complete3dsPayment(tenantId: string, params: ThreeDSCompleteParams): Promise<DirectChargeResult> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.post('/payment/3dsecure/auth', {
        locale: 'tr',
        conversationId: params.conversationId,
        paymentId: params.paymentId,
      })
      const data = response.data || {}

      if (data.status === 'success') {
        return { status: 'success', providerPaymentId: data.paymentId, raw: data }
      }
      return {
        status: 'failure',
        errorCode: data.errorCode,
        errorMessage: data.errorMessage || PAYMENT_MESSAGES.IYZICO_PAYMENT_DECLINED,
        raw: data,
      }
    } catch (error) {
      Logger.error(`${PAYMENT_MESSAGES.IYZICO_3DS_COMPLETE_FAILED} (conv ${params.conversationId}): ${error instanceof Error ? error.message : String(error)}`)
      return { status: 'failure', errorMessage: PAYMENT_MESSAGES.IYZICO_3DS_COMPLETE_FAILED }
    }
  }

  /** Iyzico BIN lookup — card brand / bank / type from the first 6–8 digits. Best-effort. */
  override async checkBin(tenantId: string, binNumber: string): Promise<ProviderBinInfo> {
    try {
      const client = await this.getAuthenticatedAxios(tenantId)
      const response = await client.post('/payment/bin/check', {
        locale: 'tr',
        conversationId: `bin-${Date.now()}`,
        binNumber: binNumber.replace(/\D/g, '').slice(0, 8),
      })
      const data = response.data || {}
      if (data.status !== 'success') return { supported: false }
      return {
        supported: true,
        bankName: data.bankName ?? null,
        cardType: data.cardType ?? null,
        cardAssociation: data.cardAssociation ?? null,
        cardFamily: data.cardFamily ?? null,
        commercial: data.commercial === 1 || data.commercial === true,
      }
    } catch (error) {
      Logger.warn(`${PAYMENT_MESSAGES.IYZICO_BIN_CHECK_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      return { supported: false }
    }
  }
}
