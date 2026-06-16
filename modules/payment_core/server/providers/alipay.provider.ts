import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider, { CheckoutSessionParams, CheckoutSessionResult } from './base.provider'
import { PAYMENT_MESSAGES } from '../payment_core.messages'
import SettingService from '@nb/setting/server/setting.service'

interface AlipayConfig {
  appId: string
  privateKey: string
  alipayPublicKey: string
  gateway: string
}

export default class AlipayProvider extends BasePaymentProvider {
  readonly name = 'alipay'

  private static async getConfig(tenantId: string): Promise<AlipayConfig> {
    const [appId, privateKey, alipayPublicKey, sandbox] = await Promise.all([
      SettingService.getValue(tenantId, 'alipayAppId'),
      SettingService.getValue(tenantId, 'alipayPrivateKey'),
      SettingService.getValue(tenantId, 'alipayPublicKey'),
      SettingService.getValue(tenantId, 'alipaySandboxMode'),
    ])
    if (!appId || !privateKey || !alipayPublicKey) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)

    const gateway = sandbox === 'true'
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do'

    return { appId, privateKey, alipayPublicKey, gateway }
  }

  private static formatPrivateKey(key: string): string {
    if (key.includes('BEGIN')) return key
    const formatted = key.match(/.{1,64}/g)?.join('\n') || key
    return `-----BEGIN RSA PRIVATE KEY-----\n${formatted}\n-----END RSA PRIVATE KEY-----`
  }

  private static buildSignContent(params: Record<string, string>): string {
    return Object.keys(params)
      .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== '')
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')
  }

  private static sign(params: Record<string, string>, privateKey: string): string {
    const content = AlipayProvider.buildSignContent(params)
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(content, 'utf8')
    return signer.sign(AlipayProvider.formatPrivateKey(privateKey), 'base64')
  }

  private static buildCommonParams(config: AlipayConfig, method: string, bizContent: Record<string, unknown>) {
    return {
      app_id: config.appId,
      method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    } as Record<string, string>
  }

  getAxiosInstance(): AxiosInstance {
    return axios.create({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  }

  async getPaymentStatus(tenantId: string, token: string): Promise<any> {
    try {
      const config = await AlipayProvider.getConfig(tenantId)
      const params = AlipayProvider.buildCommonParams(config, 'alipay.trade.query', { out_trade_no: token })
      const signed = { ...params, sign: AlipayProvider.sign(params, config.privateKey) }

      const response = await axios.post(config.gateway, new URLSearchParams(signed).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const result = response.data?.alipay_trade_query_response
      return result?.trade_status || result?.code
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.ALIPAY_GET_STATUS_FAILED)
    }
  }

  async createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    try {
      const config = await AlipayProvider.getConfig(tenantId)
      const outTradeNo = params.metadata?.paymentId || `${Date.now()}`

      const bizContent: Record<string, unknown> = {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: params.amount.toFixed(2),
        subject: params.description,
        body: params.description,
      }

      const commonParams = AlipayProvider.buildCommonParams(config, 'alipay.trade.page.pay', bizContent)
      const allParams: Record<string, string> = {
        ...commonParams,
        return_url: params.successUrl,
        notify_url: params.metadata?.notifyUrl || params.successUrl,
      }
      const signature = AlipayProvider.sign(allParams, config.privateKey)
      const signedParams = { ...allParams, sign: signature }

      const checkoutUrl = `${config.gateway}?${new URLSearchParams(signedParams).toString()}`

      return {
        sessionId: outTradeNo,
        checkoutUrl,
        providerData: { outTradeNo },
      }
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.ALIPAY_CREATE_PAYMENT_FAILED)
    }
  }
}
