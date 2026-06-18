import axios, { AxiosInstance } from 'axios';
import BasePaymentProvider, {
  CheckoutSessionParams, CheckoutSessionResult,
  CustomerPortalParams, CustomerPortalResult,
  DirectChargeParams, DirectChargeResult, ProviderBinInfo,
  ThreeDSInitParams, ThreeDSInitResult, ThreeDSCompleteParams,
  PaymentIntentParams, PaymentIntentResult, WalletDescriptor,
} from './base.provider';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/**
 * Host-facing facade that runs a payment gateway as a SANDBOXED community plugin.
 * Each op (checkout session, status, direct/3DS charge, portal, wallets) is forwarded
 * JSON-in/JSON-out into the isolate via a tenant-bound `invoke`; provider API secrets
 * (Stripe key, iyzico HMAC secret, Alipay/WeChat private keys) stay host-side in the
 * broker and never enter the isolate. Capability flags + the op allowlist come from the
 * manifest extension metadata; ops the bundle doesn't declare fall back to the base
 * default (which throws "not supported"), exactly like a built-in provider.
 *
 * The per-call `tenantId` is ignored here — `invoke` is already bound to this tenant
 * (the broker context carries it); the bundle reaches data/secrets/http tenant-scoped.
 */
export class IsolatedPaymentProvider extends BasePaymentProvider {
  readonly name: string;
  private readonly meta: Record<string, unknown>;
  private readonly ops: Set<string>;
  private readonly invoke: Invoke;

  constructor(key: string, meta: Record<string, unknown>, invoke: Invoke) {
    super();
    this.meta = meta ?? {};
    this.name = String(this.meta.label ?? key);
    this.ops = new Set(Array.isArray(this.meta.ops) ? (this.meta.ops as string[]) : []);
    this.invoke = invoke;
  }

  // Only a contract stub — sandboxed providers reach the network via host.http, never axios.
  getAxiosInstance(): AxiosInstance {
    return axios.create();
  }

  async getPaymentStatus(_tenantId: string, token: string): Promise<unknown> {
    return this.invoke('getPaymentStatus', { token });
  }

  async createCheckoutSession(_tenantId: string, params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    return this.invoke('createCheckoutSession', params) as Promise<CheckoutSessionResult>;
  }

  async createCustomerPortalSession(tenantId: string, params: CustomerPortalParams): Promise<CustomerPortalResult> {
    if (!this.ops.has('createCustomerPortalSession')) return super.createCustomerPortalSession(tenantId, params);
    return this.invoke('createCustomerPortalSession', params) as Promise<CustomerPortalResult>;
  }

  get supportsDirectCardPayment(): boolean {
    return Boolean(this.meta.supportsDirectCardPayment);
  }

  async createPayment(tenantId: string, params: DirectChargeParams): Promise<DirectChargeResult> {
    if (!this.ops.has('createPayment')) return super.createPayment(tenantId, params);
    return this.invoke('createPayment', params) as Promise<DirectChargeResult>;
  }

  async checkBin(tenantId: string, binNumber: string): Promise<ProviderBinInfo> {
    if (!this.ops.has('checkBin')) return super.checkBin(tenantId, binNumber);
    return this.invoke('checkBin', { binNumber }) as Promise<ProviderBinInfo>;
  }

  get supports3dsCardPayment(): boolean {
    return Boolean(this.meta.supports3dsCardPayment);
  }

  async create3dsPayment(tenantId: string, params: ThreeDSInitParams): Promise<ThreeDSInitResult> {
    if (!this.ops.has('create3dsPayment')) return super.create3dsPayment(tenantId, params);
    return this.invoke('create3dsPayment', params) as Promise<ThreeDSInitResult>;
  }

  async complete3dsPayment(tenantId: string, params: ThreeDSCompleteParams): Promise<DirectChargeResult> {
    if (!this.ops.has('complete3dsPayment')) return super.complete3dsPayment(tenantId, params);
    return this.invoke('complete3dsPayment', params) as Promise<DirectChargeResult>;
  }

  get supportedWallets(): WalletDescriptor[] {
    return Array.isArray(this.meta.wallets) ? (this.meta.wallets as WalletDescriptor[]) : [];
  }

  async createPaymentIntent(tenantId: string, params: PaymentIntentParams): Promise<PaymentIntentResult> {
    if (!this.ops.has('createPaymentIntent')) return super.createPaymentIntent(tenantId, params);
    return this.invoke('createPaymentIntent', params) as Promise<PaymentIntentResult>;
  }
}
