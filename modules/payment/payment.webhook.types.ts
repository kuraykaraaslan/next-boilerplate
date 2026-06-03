// Shared types for the payment-webhook service family (provider parsers,
// normalized event, dispatcher, action handlers).

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
  created: number;
}

export interface PaypalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: Record<string, any>;
  create_time: string;
}

export interface PaypalVerifyPayload {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: PaypalWebhookEvent;
}

export type InternalWebhookAction =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.refunded'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.past_due';

export interface NormalizedEvent {
  action: InternalWebhookAction;
  providerPaymentId: string;
  tenantId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string | undefined>;
  failureCode?: string;
  failureMessage?: string;
  rawEvent: unknown;
}

export interface PaypalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
}
