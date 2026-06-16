import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { WebhookDeliverySchema } from './webhook.types';
import type { WebhookDelivery } from './webhook.types';
import type { WebhookEvent } from './webhook.enums';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import WebhookMessages from './webhook.messages';
import { MAX_ATTEMPTS, type DeliveryJobData } from './webhook.config';
import { webhookQueue, enqueueDelivery } from './webhook.queue';
import WebhookDeliveryService from './webhook.delivery.service';

export async function redeliver(tenantId: string, webhookId: string, deliveryId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const deliveryRepo = ds.getRepository(WebhookDeliveryEntity);
  const webhookRepo = ds.getRepository(WebhookEntity);

  const delivery = await deliveryRepo.findOne({ where: { deliveryId, tenantId, webhookId } });
  if (!delivery) throw new AppError(WebhookMessages.DELIVERY_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const webhook = await webhookRepo.findOne({ where: { webhookId, tenantId } });
  if (!webhook) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  delivery.status = 'PENDING';
  delivery.attempts = 0;
  delivery.nextRetryAt = null;
  delivery.errorMessage = null;
  await deliveryRepo.save(delivery);

  const previousSecret =
    webhook.previousSecret &&
    webhook.previousSecretExpiresAt &&
    webhook.previousSecretExpiresAt > new Date()
      ? webhook.previousSecret
      : null;

  await webhookQueue.add(
    'redeliver',
    {
      deliveryId: delivery.deliveryId,
      tenantId: webhook.tenantId,
      webhookId: webhook.webhookId,
      url: webhook.url,
      secret: webhook.secret,
      previousSecret,
      event: delivery.event,
      payload: delivery.payload,
      requestBody: delivery.requestBody,
      headers: webhook.headers,
      ipAllowlist: webhook.ipAllowlist,
    },
    { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
  );
}

/**
 * Replay every dead-lettered delivery for a webhook. Each one is re-queued
 * with attempts reset to 0 and `status = PENDING`. Useful after the
 * subscriber endpoint comes back online.
 */
export async function replayDeadLettered(tenantId: string, webhookId: string): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(WebhookDeliveryEntity);
  const dead = await repo.find({
    where: { tenantId, webhookId, status: 'DEAD_LETTERED' },
    order: { createdAt: 'ASC' },
  });
  for (const d of dead) {
    await redeliver(tenantId, webhookId, d.deliveryId);
  }
  return dead.length;
}

export async function sendTest(tenantId: string, webhookId: string): Promise<WebhookDelivery> {
  const ds = await tenantDataSourceFor(tenantId);
  const webhook = await ds.getRepository(WebhookEntity).findOne({ where: { webhookId, tenantId } });
  if (!webhook) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const envelope = {
    webhookId: webhook.webhookId,
    tenantId: webhook.tenantId,
    event: 'test',
    createdAt: new Date().toISOString(),
    data: { message: WebhookMessages.TEST_DELIVERY_MESSAGE },
  };
  const requestBody = JSON.stringify(envelope);

  const deliveryRepo = ds.getRepository(WebhookDeliveryEntity);
  const delivery = deliveryRepo.create({
    webhookId: webhook.webhookId,
    tenantId: webhook.tenantId,
    event: 'test',
    payload: envelope as Record<string, unknown>,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 1,
    requestBody,
    responseStatus: null,
    responseBody: null,
    errorMessage: null,
    duration: null,
    nextRetryAt: null,
  });

  const saved = await deliveryRepo.save(delivery);

  await WebhookDeliveryService.execute({
    deliveryId: saved.deliveryId,
    tenantId: webhook.tenantId,
    webhookId: webhook.webhookId,
    url: webhook.url,
    secret: webhook.secret,
    event: 'test',
    payload: envelope as Record<string, unknown>,
    requestBody,
    headers: webhook.headers,
    ipAllowlist: webhook.ipAllowlist,
  } satisfies DeliveryJobData);

  const updated = await deliveryRepo.findOne({ where: { deliveryId: saved.deliveryId } });
  return WebhookDeliverySchema.parse(updated!);
}

/**
 * Manually trigger a real catalog event against a single endpoint with a sample
 * payload. Unlike {@link sendTest} (synchronous `event:'test'`), this enqueues a
 * genuine `<event>` delivery through the normal async pipeline (retries, signing,
 * rate limit, filters) so an admin can verify an integration end-to-end. Bypasses
 * the subscription filter — the admin explicitly chose this webhook + event.
 */
export async function triggerEvent(
  tenantId: string,
  webhookId: string,
  event: WebhookEvent,
  samplePayload: Record<string, unknown> = {},
): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const webhook = await ds.getRepository(WebhookEntity).findOne({ where: { webhookId, tenantId } });
  if (!webhook) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await enqueueDelivery(webhook, event, samplePayload);
}
