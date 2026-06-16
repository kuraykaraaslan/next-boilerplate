import type BasePaymentProvider from './providers/base.provider';

/**
 * Contribution shape for the `payment:gateway` extension point. A satellite
 * module (e.g. payment_stripe) default-exports one of these; the host
 * (payment.checkout.registry) discovers it via the extension registry and never
 * imports the gateway class directly. Per-tenant config/credentials stay in the
 * host + settings; the contribution only constructs the gateway implementation.
 */
export interface PaymentGatewayContribution {
  /** Stable gateway key, lowercase (e.g. 'stripe'); upper-cases to the PaymentProvider enum. */
  readonly key: string;
  /** Instantiate the gateway implementation. */
  create(): BasePaymentProvider;
}
