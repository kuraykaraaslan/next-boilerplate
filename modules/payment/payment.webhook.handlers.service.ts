import Logger from '@/modules/logger';
import type { NormalizedEvent } from './payment.webhook.types';
import PaymentWebhookPaymentService from './payment.webhook.payment.service';
import PaymentWebhookSubscriptionService from './payment.webhook.subscription.service';

export { PaymentWebhookPaymentService, PaymentWebhookSubscriptionService };

export default class PaymentWebhookHandlersService {

  static async dispatch(event: NormalizedEvent, provider: string): Promise<void> {
    Logger.info(`[Webhook:${provider}] action=${event.action} providerPaymentId=${event.providerPaymentId}`);
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
