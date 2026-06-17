import 'reflect-metadata';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import type { WebhookEvent } from './webhook.enums';
import Logger from '@kuraykaraaslan/logger';
import { checkWebhookRateLimit } from '@kuraykaraaslan/limiter/server/limiter.tenant-plan.service';
import { resolveDeliveryConfig, type DeliveryJobData } from './webhook.config';
import WebhookDeliveryService from './webhook.delivery.service';

export const WEBHOOK_QUEUE_NAME = 'webhookDeliveryQueue';

/** Shared BullMQ producer handle. Re-exposed as `WebhookService.QUEUE`. */
export const webhookQueue = new Queue<DeliveryJobData>(WEBHOOK_QUEUE_NAME, {
  connection: getBullMQConnection(),
});

/** Worker that drains the queue into the delivery engine. */
export const webhookWorker = new Worker<DeliveryJobData>(
  WEBHOOK_QUEUE_NAME,
  async (job: Job<DeliveryJobData>) => {
    await WebhookDeliveryService.execute(job.data);
  },
  {
    connection: getBullMQConnection(),
    concurrency: 10,
  },
);

/**
 * Persist a PENDING delivery row for `webhook` and enqueue its delivery job.
 * Applies the per-endpoint rate limit (deferring rather than dropping when over
 * limit) and carries the rotation-overlap previous secret when still valid.
 */
export async function enqueueDelivery(
  webhook: WebhookEntity,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const config = await resolveDeliveryConfig(webhook.tenantId);

  // Per-endpoint rate limit (sliding window). When the endpoint is over its
  // limit we defer the job by ~one window instead of dropping the event.
  let deferDelayMs = 0;
  const rateLimit = webhook.rateLimitPerMinute ?? config.defaultRateLimitPerMinute;
  if (rateLimit && rateLimit > 0) {
    try {
      const rl = await checkWebhookRateLimit(webhook.webhookId, rateLimit);
      if (!rl.success) {
        deferDelayMs = 60_000;
        Logger.warn(`[Webhook] rate limit hit for webhook=${webhook.webhookId} (${rateLimit}/min) — deferring delivery ~60s`);
      }
    } catch (err) {
      Logger.warn(`[Webhook] rate-limit check failed for webhook=${webhook.webhookId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const envelope = {
    webhookId: webhook.webhookId,
    tenantId: webhook.tenantId,
    event,
    createdAt: new Date().toISOString(),
    data: payload,
  };
  const requestBody = JSON.stringify(envelope);

  const ds = await tenantDataSourceFor(webhook.tenantId);
  const deliveryRepo = ds.getRepository(WebhookDeliveryEntity);

  const delivery = deliveryRepo.create({
    webhookId: webhook.webhookId,
    tenantId: webhook.tenantId,
    event,
    payload: envelope as Record<string, unknown>,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: config.maxAttempts,
    requestBody,
    responseStatus: null,
    responseBody: null,
    errorMessage: null,
    duration: null,
    nextRetryAt: null,
  });

  const saved = await deliveryRepo.save(delivery);

  // Drop the rotation overlap secret if it expired.
  const previousSecret =
    webhook.previousSecret &&
    webhook.previousSecretExpiresAt &&
    webhook.previousSecretExpiresAt > new Date()
      ? webhook.previousSecret
      : null;

  await webhookQueue.add(
    'deliver',
    {
      deliveryId: saved.deliveryId,
      tenantId: webhook.tenantId,
      webhookId: webhook.webhookId,
      url: webhook.url,
      secret: webhook.secret,
      previousSecret,
      event,
      payload: envelope as Record<string, unknown>,
      requestBody,
      headers: webhook.headers,
      ipAllowlist: webhook.ipAllowlist,
    },
    {
      attempts: config.maxAttempts,
      backoff: { type: 'exponential', delay: config.retryDelaysMs[0] ?? 60_000 },
      ...(deferDelayMs > 0 ? { delay: deferDelayMs } : {}),
    },
  );
}
