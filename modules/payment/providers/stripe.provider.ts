import axios, { AxiosInstance } from 'axios'
import BasePaymentProvider from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'

export default class StripeProvider extends BasePaymentProvider {
  readonly name = 'stripe'

  private static readonly STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!
  private static readonly STRIPE_API_URL = 'https://api.stripe.com/v1'

  private static axiosInstance: AxiosInstance = StripeProvider.initializeAxios()

  private static initializeAxios(): AxiosInstance {
    return axios.create({
      baseURL: this.STRIPE_API_URL,
      headers: {
        Authorization: `Bearer ${this.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  getAxiosInstance(): AxiosInstance {
    if (!StripeProvider.axiosInstance) {
      StripeProvider.axiosInstance = StripeProvider.initializeAxios()
    }
    return StripeProvider.axiosInstance
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      const response = await this.getAxiosInstance().get(`/payment_intents/${token}`)
      return response.data.status
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.STRIPE_GET_STATUS_FAILED)
    }
  }
}
