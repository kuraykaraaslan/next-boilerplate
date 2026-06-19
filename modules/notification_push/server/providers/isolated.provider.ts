import type { PushPayload } from '../notification_push.config';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

export interface PushSendResult {
  ok: boolean;
  /** HTTP status from the push service (used to prune 404/410 dead subscriptions). */
  statusCode?: number | null;
  error?: string;
}

export interface PushSubscriptionRef {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Host-facing facade that runs a push backend as a SANDBOXED community plugin. The
 * isolate only orchestrates; the trust-critical / impossible-in-isolate work (Web Push
 * payload encryption + VAPID signing) runs host-side via the `webpush` capability, and
 * the VAPID private key never enters the isolate. Returns a normalized result so the
 * send service can prune expired (404/410) subscriptions.
 */
export class IsolatedPushProvider {
  constructor(private readonly invoke: Invoke) {}

  async send(subscription: PushSubscriptionRef, payload: PushPayload): Promise<PushSendResult> {
    const r = (await this.invoke('send', { subscription, payload })) as PushSendResult | null;
    return r ?? { ok: false, error: 'no result from push provider' };
  }
}
