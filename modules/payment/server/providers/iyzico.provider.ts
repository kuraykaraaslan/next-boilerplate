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
import SettingService from '@nb/setting/server/setting.service'
import Logger from '@nb/logger'
import { getAuthenticatedAxios } from './iyzico.client'
import { buildChargeBody, buildCheckoutBody } from './iyzico.body'

export default class IyzicoProvider extends BasePaymentProvider {
  readonly name = 'iyzico'

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const client = await getAuthenticatedAxios(tenantId)
      const path = '/payment/iyzipos/checkoutform/auth/ecom/detail'
      const response = await client.post(path, {
        locale: 'tr',
        conversationId: token,
        token,
      })
      return response.data.status
    } catch {
      throw new Error(PAYMENT_MESSAGES.IYZICO_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const client = await getAuthenticatedAxios(tenantId)
      const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom'

      const conversationId = params.metadata?.paymentId || `${Date.now()}`
      // Optional installment scoping for the hosted form. e.g. "1,2,3,6,9" → [1,2,3,6,9].
      const installmentsRaw = await SettingService.getValue(tenantId, 'iyzicoEnabledInstallments').catch(() => null)
      const enabledInstallments = (installmentsRaw || '')
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0)

      const body = buildCheckoutBody(tenantId, params, conversationId, enabledInstallments)
      const response = await client.post(path, body)

      return {
        sessionId: response.data.token || conversationId,
        checkoutUrl: response.data.paymentPageUrl || response.data.checkoutFormContent || '',
        providerData: { token: response.data.token },
      }
    } catch {
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
   * Non-3DS direct charge via `/payment/auth`.
   */
  override async createPayment(tenantId: string, params: DirectChargeParams): Promise<DirectChargeResult> {
    const conversationId = params.metadata?.paymentId || `${Date.now()}`
    try {
      const client = await getAuthenticatedAxios(tenantId)
      const response = await client.post('/payment/auth', buildChargeBody(tenantId, params, conversationId))
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
      const client = await getAuthenticatedAxios(tenantId)
      const body = { ...buildChargeBody(tenantId, params, conversationId), callbackUrl: params.callbackUrl }
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
      const client = await getAuthenticatedAxios(tenantId)
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
      const client = await getAuthenticatedAxios(tenantId)
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
