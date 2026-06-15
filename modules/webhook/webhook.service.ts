import 'reflect-metadata';
import type { WebhookDelivery, WebhookMetrics } from './webhook.types';
import type { ListDeliveriesInput } from './webhook.dto';
import type { WebhookEvent } from './webhook.enums';
import { signPayload, generateSecret } from './webhook.crypto';
import { webhookQueue } from './webhook.queue';
import { dispatchEvent, dispatchPlatformEvent } from './webhook.dispatch.service';
import { redeliver, replayDeadLettered, sendTest, triggerEvent } from './webhook.redeliver.service';
import WebhookMetricsService from './webhook.metrics.service';

/**
 * Public coordinator for the webhook subsystem: endpoint CRUD, event dispatch,
 * secret rotation, manual (re)delivery, and reporting. The heavy machinery is
 * delegated to focused collaborators — billing-gated dispatch
 * (`webhook.dispatch.service`), manual redeliver/replay/test/trigger
 * (`webhook.redeliver.service`), HTTP delivery + circuit breaker
 * (`WebhookDeliveryService`), the BullMQ producer/worker (`webhook.queue.ts`),
 * delivery tuning (`webhook.config.ts`), reporting (`WebhookMetricsService`),
 * payload filters (`webhook.filters.ts`) and signing (`webhook.crypto.ts`).
 */
export default class WebhookService {
  /** Shared producer handle (the queue + worker live in `webhook.queue.ts`). */
  static readonly QUEUE = webhookQueue;

  static signPayload(secret: string, body: string): string {
    return signPayload(secret, body);
  }

  static generateSecret(): string {
    return generateSecret();
  }

  static dispatchEvent(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return dispatchEvent(tenantId, event, payload);
  }

  static dispatchPlatformEvent(
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return dispatchPlatformEvent(event, payload);
  }

  static redeliver(tenantId: string, webhookId: string, deliveryId: string): Promise<void> {
    return redeliver(tenantId, webhookId, deliveryId);
  }

  static replayDeadLettered(tenantId: string, webhookId: string): Promise<number> {
    return replayDeadLettered(tenantId, webhookId);
  }

  static sendTest(tenantId: string, webhookId: string): Promise<WebhookDelivery> {
    return sendTest(tenantId, webhookId);
  }

  static triggerEvent(
    tenantId: string,
    webhookId: string,
    event: WebhookEvent,
    samplePayload: Record<string, unknown> = {},
  ): Promise<void> {
    return triggerEvent(tenantId, webhookId, event, samplePayload);
  }

  static listDeliveries(input: ListDeliveriesInput): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    return WebhookMetricsService.listDeliveries(input);
  }

  static getMetrics(
    tenantId: string,
    opts: { webhookId?: string; since?: Date } = {},
  ): Promise<WebhookMetrics> {
    return WebhookMetricsService.getMetrics(tenantId, opts);
  }
}
