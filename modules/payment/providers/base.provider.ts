import { AxiosInstance } from 'axios'

export interface CheckoutSessionParams {
  amount: number
  currency: string
  description: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export interface CheckoutSessionResult {
  sessionId: string
  checkoutUrl: string
  providerData?: Record<string, any>
}

export default abstract class BasePaymentProvider {
  abstract readonly name: string
  abstract getAxiosInstance(): AxiosInstance
  abstract getPaymentStatus(token: string): Promise<any>
  abstract createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>
}
