import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult, WalletDescriptor } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@nb/setting/server/setting.service'

interface WeChatPayConfig {
  appId: string
  mchId: string
  privateKey: string
  serialNo: string
  apiV3Key: string
  notifyUrl: string
}

export default class WeChatPayProvider extends BasePaymentProvider {
  readonly name = 'wechatpay'

  override get supportedWallets(): WalletDescriptor[] {
    return [{ method: 'WECHAT_PAY', delivery: 'HOSTED_REDIRECT' }]
  }

  private static readonly API_BASE = 'https://api.mch.weixin.qq.com'

  private static async getConfig(tenantId: string): Promise<WeChatPayConfig> {
    const [appId, mchId, privateKey, serialNo, apiV3Key, notifyUrl] = await Promise.all([
      SettingService.getValue(tenantId, 'wechatPayAppId'),
      SettingService.getValue(tenantId, 'wechatPayMchId'),
      SettingService.getValue(tenantId, 'wechatPayPrivateKey'),
      SettingService.getValue(tenantId, 'wechatPaySerialNo'),
      SettingService.getValue(tenantId, 'wechatPayApiV3Key'),
      SettingService.getValue(tenantId, 'wechatPayNotifyUrl'),
    ])
    if (!appId || !mchId || !privateKey || !serialNo) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)
    return {
      appId,
      mchId,
      privateKey,
      serialNo,
      apiV3Key: apiV3Key || '',
      notifyUrl: notifyUrl || '',
    }
  }

  private static formatPrivateKey(key: string): string {
    if (key.includes('BEGIN')) return key
    const formatted = key.match(/.{1,64}/g)?.join('\n') || key
    return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`
  }

  private static buildAuthHeader(
    config: WeChatPayConfig,
    method: string,
    urlPath: string,
    body: string,
  ): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(message, 'utf8')
    const signature = signer.sign(WeChatPayProvider.formatPrivateKey(config.privateKey), 'base64')

    const token =
      `mchid="${config.mchId}",` +
      `nonce_str="${nonce}",` +
      `timestamp="${timestamp}",` +
      `serial_no="${config.serialNo}",` +
      `signature="${signature}"`

    return `WECHATPAY2-SHA256-RSA2048 ${token}`
  }

  private async authenticatedRequest<T = any>(
    tenantId: string,
    method: 'GET' | 'POST',
    urlPath: string,
    body: Record<string, unknown> | null,
  ): Promise<T> {
    const config = await WeChatPayProvider.getConfig(tenantId)
    const bodyStr = body ? JSON.stringify(body) : ''
    const authHeader = WeChatPayProvider.buildAuthHeader(config, method, urlPath, bodyStr)

    const response = await axios.request<T>({
      method,
      url: `${WeChatPayProvider.API_BASE}${urlPath}`,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'next-boilerplate-wechatpay/1.0',
      },
      data: body || undefined,
    })
    return response.data
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: WeChatPayProvider.API_BASE,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const config = await WeChatPayProvider.getConfig(tenantId)
      const urlPath = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(token)}?mchid=${encodeURIComponent(config.mchId)}`
      const data: any = await this.authenticatedRequest(tenantId, 'GET', urlPath, null)
      return data?.trade_state || data
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.WECHATPAY_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const config = await WeChatPayProvider.getConfig(tenantId)
      const outTradeNo = params.metadata?.paymentId || `${Date.now()}`
      const notifyUrl = params.metadata?.notifyUrl || config.notifyUrl || params.successUrl

      const body: Record<string, unknown> = {
        appid: config.appId,
        mchid: config.mchId,
        description: params.description,
        out_trade_no: outTradeNo,
        notify_url: notifyUrl,
        amount: {
          total: Math.round(params.amount * 100),
          currency: params.currency.toUpperCase() === 'CNY' ? 'CNY' : 'CNY',
        },
      }

      const data = await this.authenticatedRequest<{ code_url: string }>(
        tenantId,
        'POST',
        '/v3/pay/transactions/native',
        body,
      )

      return {
        sessionId: outTradeNo,
        checkoutUrl: data.code_url,
        providerData: { outTradeNo, codeUrl: data.code_url },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.WECHATPAY_CREATE_PAYMENT_FAILED)
    }
  }
}
