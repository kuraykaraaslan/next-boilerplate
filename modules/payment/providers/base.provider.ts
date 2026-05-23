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

/**
 * BasePaymentProvider
 *
 * All provider implementations are **singletons** held inside
 * `PaymentService.PROVIDERS`. That means tenant context cannot live on
 * the instance — every payment-relevant method takes `tenantId` as the
 * first argument, so that the provider can read tenant-scoped Stripe /
 * PayPal / Iyzico / etc. API keys from `SettingService.getValue(tenantId, ...)`.
 *
 * `getAxiosInstance()` is intentionally NOT tenant-scoped — it is only
 * used as a low-level, unauthenticated fallback (e.g. for health checks).
 */
export default abstract class BasePaymentProvider {
  abstract readonly name: string
  abstract getAxiosInstance(): AxiosInstance
  abstract getPaymentStatus(tenantId: string, token: string): Promise<any>
  abstract createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult>
}
