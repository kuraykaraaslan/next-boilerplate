import CryptoJS from 'crypto-js'
import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'

export default class IyzicoProvider extends BasePaymentProvider {
  readonly name = 'iyzico'

  private static readonly API_KEY = process.env.IYZICO_API_KEY!
  private static readonly SECRET_KEY = process.env.IYZICO_SECRET_KEY!
  private static readonly BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

  private static axiosInstance: AxiosInstance = IyzicoProvider.initializeAxios()

  private static initializeAxios(): AxiosInstance {
    const instance = axios.create({
      baseURL: IyzicoProvider.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    instance.interceptors.request.use(
      (config) => {
        const uri_path = config.url!
        const payload = config.data ? JSON.stringify(config.data) : ''
        const { authorization, 'x-iyzi-rnd': rnd } = IyzicoProvider.generateAuthorizationString(payload, uri_path)
        config.headers['authorization'] = authorization
        config.headers['x-iyzi-rnd'] = rnd
        config.headers['content-type'] = 'application/json'
        return config
      },
      (error) => Promise.reject(error)
    )

    return instance
  }

  private static generateAuthorizationString(
    payload: string,
    uriPath: string
  ): { authorization: string; 'x-iyzi-rnd': string } {
    const randomKey = `${Date.now()}123456789`
    const fullPayload = randomKey + uriPath + payload
    const signature = CryptoJS.HmacSHA256(fullPayload, this.SECRET_KEY).toString()
    const authStr = `apiKey:${this.API_KEY}&randomKey:${randomKey}&signature:${signature}`
    const encoded = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authStr))

    return {
      authorization: `IYZWSv2 ${encoded}`,
      'x-iyzi-rnd': randomKey,
    }
  }

  getAxiosInstance(): AxiosInstance {
    if (!IyzicoProvider.axiosInstance) {
      IyzicoProvider.axiosInstance = IyzicoProvider.initializeAxios()
    }
    return IyzicoProvider.axiosInstance
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      const path = '/payment/iyzipos/checkoutform/auth/ecom/detail'

      const requestBody = {
        locale: 'tr',
        conversationId: '123456789',
        token: token,
      }

      const response = await this.getAxiosInstance().post(path, requestBody)
      return response.data.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.IYZICO_GET_STATUS_FAILED)
    }
  }
}
