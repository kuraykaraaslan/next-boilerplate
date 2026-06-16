import Logger from '@nb/logger';
import redis from '@nb/redis';
import type { NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookPaymentService from './payment.webhook.payment.service';
import PaymentWebhookSubscriptionService from './payment.webhook.subscription.service';

export { PaymentWebhookPaymentService, PaymentWebhookSubscriptionService };

// Processed-event marker TTL — providers may redeliver for hours/days.
const WEBHOOK_DEDUPE_TTL_SEC = 7 * 24 * 60 * 60;

export default class PaymentWebhookHandlersService {

  /**
   * Idempotency: providers retry webhooks aggressively and may deliver the same
   * event more than once. Processing `payment.completed`/`payment.refunded`
   * twice would double-credit or double-refund, so we claim each event once via
   * Redis SET NX. Fails open on a Redis outage (better a rare reprocess than a
   * dropped payment event).
   */
  private static async alreadyProcessed(event: NormalizedEvent, provider: string): Promise<boolean> {
    const key = event.eventId
      ? `pay:wh:evt:${provider}:${event.eventId}`
      : `pay:wh:evt:${provider}:${event.action}:${event.providerPaymentId}:${event.amount ?? ''}`;
    try {
      const claimed = await redis.set(key, '1', 'EX', WEBHOOK_DEDUPE_TTL_SEC, 'NX');
      return claimed !== 'OK';
    } catch {
      return false; // fail open
    }
  }

  static async dispatch(event: NormalizedEvent, provider: string): Promise<void> {
    Logger.info(`[Webhook:${provider}] action=${event.action} providerPaymentId=${event.providerPaymentId}`);
    if (await PaymentWebhookHandlersService.alreadyProcessed(event, provider)) {
      Logger.info(`[Webhook:${provider}] duplicate event ignored (action=${event.action})`);
      return;
    }
    try {
      switch (event.action) {
        case 'payment.completed':        await PaymentWebhookPaymentService.onPaymentCompleted(event, provider); break;
        case 'payment.failed':           await PaymentWebhookPaymentService.onPaymentFailed(event, provider); break;
        case 'payment.expired':          await PaymentWebhookPaymentService.onPaymentExpired(event, provider); break;
        case 'payment.refunded':         await PaymentWebhookPaymentService.onPaymentRefunded(event, provider); break;
        case 'subscription.cancelled':   await PaymentWebhookSubscriptionService.onSubscriptionCancelled(event, provider); break;
        case 'subscription.past_due':    await PaymentWebhookSubscriptionService.onSubscriptionPastDue(event, provider); break;
        case 'subscription.renewed':     await PaymentWebhookSubscriptionService.onSubscriptionRenewed(event, provider); break;
      }
    } catch (error) {
      Logger.error(`[Webhook:${provider}] action=${event.action} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
