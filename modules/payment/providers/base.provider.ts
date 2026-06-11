import { AxiosInstance } from 'axios'
import type { WalletDescriptor } from '../payment.enums'

export type { WalletDescriptor, WalletMethod, WalletDelivery } from '../payment.enums'

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

/**
 * Raw card collected by the shared (non-3DS) credit-card form. PCI-sensitive —
 * passed straight to the provider, never persisted or logged. `expireYear` may be
 * 2- or 4-digit; providers normalize as needed.
 */
export interface DirectChargeCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string; // MM
  expireYear: string;  // YY or YYYY
  cvc: string;
}

export interface DirectChargeParams {
  amount: number;
  currency: string;
  description: string;
  card: DirectChargeCard;
  buyer?: {
    id?: string;
    name?: string;
    surname?: string;
    email?: string;
    identityNumber?: string;
    ip?: string;
  };
  basketItems?: Array<{ id: string; name: string; price: number }>;
  metadata?: Record<string, string>;
}

export interface DirectChargeResult {
  status: 'success' | 'failure';
  /** Provider-side payment id on success. */
  providerPaymentId?: string;
  errorCode?: string;
  errorMessage?: string;
  /** Raw provider response (never contains card data). */
  raw?: unknown;
}

/**
 * Provider-side BIN metadata. `supported: false` means the provider has no BIN
 * lookup (the caller relies solely on the public BIN→country lookup instead).
 */
export interface ProviderBinInfo {
  supported: boolean;
  bankName?: string | null;
  cardType?: string | null;        // CREDIT_CARD / DEBIT_CARD / PREPAID_CARD
  cardAssociation?: string | null; // VISA / MASTER_CARD / TROY / AMERICAN_EXPRESS
  cardFamily?: string | null;
  commercial?: boolean;
}

/** Same as {@link DirectChargeParams} plus where the bank should return after 3DS. */
export interface ThreeDSInitParams extends DirectChargeParams {
  callbackUrl: string;
}

export interface ThreeDSInitResult {
  status: 'success' | 'failure';
  /** Base64-encoded, self-submitting HTML for the bank's 3DS page (on success). */
  htmlContent?: string;
  /** Our conversation id echoed back on the bank callback (= our paymentId). */
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface ThreeDSCompleteParams {
  /** Our conversation id from the callback (= our paymentId). */
  conversationId: string;
  /** Provider-side payment id from the callback. */
  paymentId: string;
}

/** Create a client-confirmed PaymentIntent (Stripe Express Checkout: Apple/Google Pay, Click to Pay…). */
export interface PaymentIntentParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  /** Client secret consumed by the front-end Element. */
  clientSecret: string;
  /** Publishable key for the client SDK (null when not configured). */
  publishableKey: string | null;
  /** Provider-side intent id (e.g. Stripe `pi_...`). */
  providerRef: string;
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

  /**
   * Whether this provider can charge a raw card directly (the shared non-3DS
   * card form). When `false`, the checkout UI must fall back to the hosted
   * redirect flow (`createCheckoutSession`). Subclasses that implement
   * {@link createPayment} override this to `true`.
   */
  get supportsDirectCardPayment(): boolean {
    return false;
  }

  /**
   * Charge a raw card directly (non-3DS). Implemented by providers that support
   * collecting the card on our own form (e.g. Iyzico `/payment/auth`). Default:
   * not supported — callers should check {@link supportsDirectCardPayment} first.
   */
  async createPayment(_tenantId: string, _params: DirectChargeParams): Promise<DirectChargeResult> {
    throw new Error(`${this.name} does not support direct card payments`);
  }

  /**
   * Provider-side BIN lookup (card brand / bank / type from the first 6–8 digits).
   * Default: not supported. Iyzico overrides with its `/payment/bin/check` call.
   */
  async checkBin(_tenantId: string, _binNumber: string): Promise<ProviderBinInfo> {
    return { supported: false };
  }

  /**
   * Whether this provider supports a 3D Secure card flow (init → bank challenge →
   * callback → complete). When `true`, {@link create3dsPayment} +
   * {@link complete3dsPayment} are implemented. Default: not supported.
   */
  get supports3dsCardPayment(): boolean {
    return false;
  }

  /**
   * Start a 3DS charge. Returns base64 HTML the browser renders (full-page or
   * popup) to take the cardholder to the bank's 3DS page. The bank then POSTs to
   * `params.callbackUrl`, which finalizes via {@link complete3dsPayment}.
   */
  async create3dsPayment(_tenantId: string, _params: ThreeDSInitParams): Promise<ThreeDSInitResult> {
    throw new Error(`${this.name} does not support 3DS card payments`);
  }

  /** Finalize a 3DS charge after the bank callback. */
  async complete3dsPayment(_tenantId: string, _params: ThreeDSCompleteParams): Promise<DirectChargeResult> {
    throw new Error(`${this.name} does not support 3DS card payments`);
  }

  /**
   * Wallets / alternative payment methods this provider can surface, with how each
   * is delivered (hosted redirect, client-side Element, or direct API). Hosted
   * wallets (e.g. iyzico MasterPass/BKM) require no extra code — they appear on the
   * provider's hosted checkout. Default: none.
   */
  get supportedWallets(): WalletDescriptor[] {
    return [];
  }

  /**
   * Create a PaymentIntent for a client-side wallet Element (Stripe Express
   * Checkout renders Apple Pay / Google Pay / Click to Pay / Link / PayPal from
   * one Element). Default: not supported.
   */
  async createPaymentIntent(_tenantId: string, _params: PaymentIntentParams): Promise<PaymentIntentResult> {
    throw new Error(`${this.name} does not support client-side payment intents`);
  }
}
