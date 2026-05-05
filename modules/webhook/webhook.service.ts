import 'reflect-metadata';
import crypto from 'crypto';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/libs/redis/bullmq';
import { tenantDataSourceFor } from '@/libs/typeorm';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { SafeWebhookSchema, WebhookDeliverySchema } from './webhook.types';
import type { SafeWebhook, WebhookDelivery } from './webhook.types';
import type { CreateWebhookInput, UpdateWebhookInput, ListWebhooksInput, ListDeliveriesInput } from './webhook.dto';
import type { WebhookEvent } from './webhook.enums';
import WebhookMessages from './webhook.messages';
import Logger from '@/libs/logger';

interface DeliveryJobData {
  deliveryId: string;
  tenantId: string;
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  requestBody: string;
}

const MAX_ATTEMPTS = 3;
// Exponential backoff: attempt 1 → 60s, attempt 2 → 300s, attempt 3 → 900s
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000];

export default class WebhookService {
  static readonly QUEUE_NAME = 'webhookDeliveryQueue';

  static readonly QUEUE = new Queue<DeliveryJobData>(WebhookService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<DeliveryJobData>(
    WebhookService.QUEUE_NAME,
    async (job: Job<DeliveryJobData>) => {
      await WebhookService._executeDelivery(job.data);
    },
    {
      connection: getBullMQConnection(),
      concurrency: 10,
    },
  );

  // ============================================================================
  // HMAC signature
  // ============================================================================

  static signPayload(secret: string, body: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  static generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  static async list({ tenantId, page, pageSize }: ListWebhooksInput): Promise<{ webhooks: SafeWebhook[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(WebhookEntity).findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { webhooks: rows.map((r) => SafeWebhookSchema.parse(r)), total };
  }

  static async getById(tenantId: string, webhookId: string): Promise<SafeWebhook> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(WebhookEntity).findOne({ where: { webhookId, tenantId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);
    return SafeWebhookSchema.parse(row);
  }

  static async create(tenantId: string, createdByUserId: string, input: CreateWebhookInput): Promise<SafeWebhook> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);

    const entity = repo.create({
      tenantId,
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      url: input.url,
      secret: WebhookService.generateSecret(),
      events: input.events,
      isActive: true,
    });

    const saved = await repo.save(entity);
    return SafeWebhookSchema.parse(saved);
  }

  static async update(tenantId: string, webhookId: string, input: UpdateWebhookInput): Promise<SafeWebhook> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);

    const row = await repo.findOne({ where: { webhookId, tenantId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.url !== undefined) row.url = input.url;
    if (input.events !== undefined) row.events = input.events;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    const saved = await repo.save(row);
    return SafeWebhookSchema.parse(saved);
  }

  static async delete(tenantId: string, webhookId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);
    const row = await repo.findOne({ where: { webhookId, tenantId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);
    await repo.remove(row);
  }

  // ============================================================================
  // Dispatch — called from other services when an event occurs
  // ============================================================================

  static async dispatchEvent(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const webhooks = await ds.getRepository(WebhookEntity).find({
        where: { tenantId, isActive: true },
      });

      const matching = webhooks.filter((w) => w.events.includes(event));
      await Promise.all(matching.map((w) => WebhookService._enqueueDelivery(w, event, payload)));
    } catch (err) {
      Logger.error(`[Webhook] dispatchEvent failed for tenant=${tenantId} event=${event}: ${err}`);
    }
  }

  private static async _enqueueDelivery(
    webhook: WebhookEntity,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
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
      maxAttempts: MAX_ATTEMPTS,
      requestBody,
      responseStatus: null,
      responseBody: null,
      errorMessage: null,
      duration: null,
      nextRetryAt: null,
    });

    const saved = await deliveryRepo.save(delivery);

    await WebhookService.QUEUE.add(
      'deliver',
      {
        deliveryId: saved.deliveryId,
        tenantId: webhook.tenantId,
        webhookId: webhook.webhookId,
        url: webhook.url,
        secret: webhook.secret,
        event,
        payload: envelope as Record<string, unknown>,
        requestBody,
      },
      { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
    );
  }

  // ============================================================================
  // Redeliver a failed delivery
  // ============================================================================

  static async redeliver(tenantId: string, webhookId: string, deliveryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const deliveryRepo = ds.getRepository(WebhookDeliveryEntity);
    const webhookRepo = ds.getRepository(WebhookEntity);

    const delivery = await deliveryRepo.findOne({ where: { deliveryId, tenantId, webhookId } });
    if (!delivery) throw new Error(WebhookMessages.DELIVERY_NOT_FOUND);

    const webhook = await webhookRepo.findOne({ where: { webhookId, tenantId } });
    if (!webhook) throw new Error(WebhookMessages.NOT_FOUND);

    delivery.status = 'PENDING';
    delivery.attempts = 0;
    delivery.nextRetryAt = null;
    delivery.errorMessage = null;
    await deliveryRepo.save(delivery);

    await WebhookService.QUEUE.add(
      'redeliver',
      {
        deliveryId: delivery.deliveryId,
        tenantId: webhook.tenantId,
        webhookId: webhook.webhookId,
        url: webhook.url,
        secret: webhook.secret,
        event: delivery.event,
        payload: delivery.payload,
        requestBody: delivery.requestBody,
      },
      { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
    );
  }

  // ============================================================================
  // Test delivery — immediate, synchronous, no retry
  // ============================================================================

  static async sendTest(tenantId: string, webhookId: string): Promise<WebhookDelivery> {
    const ds = await tenantDataSourceFor(tenantId);
    const webhook = await ds.getRepository(WebhookEntity).findOne({ where: { webhookId, tenantId } });
    if (!webhook) throw new Error(WebhookMessages.NOT_FOUND);

    const envelope = {
      webhookId: webhook.webhookId,
      tenantId: webhook.tenantId,
      event: 'test',
      createdAt: new Date().toISOString(),
      data: { message: 'This is a test delivery from the webhook system.' },
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

    await WebhookService._executeDelivery({
      deliveryId: saved.deliveryId,
      tenantId: webhook.tenantId,
      webhookId: webhook.webhookId,
      url: webhook.url,
      secret: webhook.secret,
      event: 'test',
      payload: envelope as Record<string, unknown>,
      requestBody,
    });

    const updated = await deliveryRepo.findOne({ where: { deliveryId: saved.deliveryId } });
    return WebhookDeliverySchema.parse(updated!);
  }

  // ============================================================================
  // Deliveries list
  // ============================================================================

  static async listDeliveries({ tenantId, webhookId, page, pageSize }: ListDeliveriesInput): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(WebhookDeliveryEntity).findAndCount({
      where: { tenantId, webhookId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { deliveries: rows.map((r) => WebhookDeliverySchema.parse(r)), total };
  }

  // ============================================================================
  // Internal HTTP delivery
  // ============================================================================

  private static async _executeDelivery(data: DeliveryJobData): Promise<void> {
    const { deliveryId, tenantId, url, secret, requestBody } = data;
    const signature = WebhookService.signPayload(secret, requestBody);
    const startedAt = Date.now();

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let status: 'SUCCESS' | 'FAILED' = 'FAILED';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': data.event,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'NextBoilerplate-Webhooks/1.0',
        },
        body: requestBody,
        signal: AbortSignal.timeout(15_000),
      });

      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 4096);
      status = response.ok ? 'SUCCESS' : 'FAILED';

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}`;
      }
    } catch (err: any) {
      errorMessage = err?.message ?? 'Unknown error';
    }

    const duration = Date.now() - startedAt;

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(WebhookDeliveryEntity);
      const row = await repo.findOne({ where: { deliveryId } });
      if (!row) return;

      row.status = status;
      row.attempts = row.attempts + 1;
      row.responseStatus = responseStatus;
      row.responseBody = responseBody;
      row.errorMessage = errorMessage;
      row.duration = duration;

      if (status === 'FAILED' && row.attempts < row.maxAttempts) {
        const delay = RETRY_DELAYS_MS[row.attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;
        row.nextRetryAt = new Date(Date.now() + delay);
        row.status = 'PENDING';
      }

      await repo.save(row);
    } catch (err) {
      Logger.error(`[Webhook] Failed to update delivery record ${deliveryId}: ${err}`);
    }
  }
}
