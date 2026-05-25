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
export interface CustomerPortalParams {
  /** End customer identifier with this provider — Stripe customer id, PayPal payer id, …. */
  customerExternalId?: string;
  /** End customer email (fallback when there's no provider-side customer record yet). */
  customerEmail?: string;
  /** Where the provider should send the customer back to. */
  returnUrl: string;
}

export interface CustomerPortalResult {
  /** Hosted URL to redirect the customer to. `null` when the provider does not offer a portal. */
  url: string | null;
  /** Provider-specific notes — surfaced to the operator in error messages. */
  note?: string;
}

export default abstract class BasePaymentProvider {
  abstract readonly name: string
  abstract getAxiosInstance(): AxiosInstance
  abstract getPaymentStatus(tenantId: string, token: string): Promise<any>
  abstract createCheckoutSession(
    tenantId: string,
    params: CheckoutSessionParams,
  ): Promise<CheckoutSessionResult>

  /**
   * Self-service billing / subscription portal URL for an end customer.
   * Each provider implements what it can — Stripe has a full portal, PayPal
   * surfaces subscription management, Iyzico has none. Providers that can't
   * deliver a portal return `{ url: null, note: ... }` and the route layer
   * can fall back to in-app cancellation UI.
   *
   * Default implementation: no portal. Subclasses override.
   */
  async createCustomerPortalSession(
    _tenantId: string,
    _params: CustomerPortalParams,
  ): Promise<CustomerPortalResult> {
    return { url: null, note: `${this.name} does not provide a customer portal` };
  }
}
