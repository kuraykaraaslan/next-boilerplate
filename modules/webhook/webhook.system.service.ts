import 'reflect-metadata';
import crypto from 'crypto';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/libs/redis/bullmq';
import { getSystemDataSource } from '@/libs/typeorm';
import { SystemWebhook as SystemWebhookEntity } from './entities/system_webhook.entity';
import { SystemWebhookDelivery as SystemWebhookDeliveryEntity } from './entities/system_webhook_delivery.entity';
import { SafeSystemWebhookSchema, WebhookDeliverySchema } from './webhook.types';
import type { SafeSystemWebhook, WebhookDelivery } from './webhook.types';
import type { CreateWebhookInput, UpdateWebhookInput, ListWebhooksInput, ListDeliveriesInput } from './webhook.dto';
import type { SystemWebhookEvent } from './webhook.enums';
import WebhookMessages from './webhook.messages';
import Logger from '@/libs/logger';

interface SystemDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  requestBody: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000];

export default class SystemWebhookService {
  static readonly QUEUE_NAME = 'systemWebhookDeliveryQueue';

  static readonly QUEUE = new Queue<SystemDeliveryJobData>(SystemWebhookService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<SystemDeliveryJobData>(
    SystemWebhookService.QUEUE_NAME,
    async (job: Job<SystemDeliveryJobData>) => {
      await SystemWebhookService._executeDelivery(job.data);
    },
    {
      connection: getBullMQConnection(),
      concurrency: 10,
    },
  );

  // ============================================================================
  // HMAC
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

  static async list({ page, pageSize }: Omit<ListWebhooksInput, 'tenantId'>): Promise<{ webhooks: SafeSystemWebhook[]; total: number }> {
    const ds = await getSystemDataSource();
    const [rows, total] = await ds.getRepository(SystemWebhookEntity).findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      webhooks: rows.map((r) => SafeSystemWebhookSchema.parse(r)),
      total,
    };
  }

  static async getById(webhookId: string): Promise<SafeSystemWebhook> {
    const ds = await getSystemDataSource();
    const row = await ds.getRepository(SystemWebhookEntity).findOne({ where: { webhookId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);
    return SafeSystemWebhookSchema.parse(row);
  }

  static async create(createdByUserId: string, input: CreateWebhookInput): Promise<SafeSystemWebhook> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SystemWebhookEntity);

    const entity = repo.create({
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      url: input.url,
      secret: SystemWebhookService.generateSecret(),
      events: input.events,
      isActive: true,
    });

    const saved = await repo.save(entity);
    return SafeSystemWebhookSchema.parse(saved);
  }

  static async update(webhookId: string, input: UpdateWebhookInput): Promise<SafeSystemWebhook> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SystemWebhookEntity);

    const row = await repo.findOne({ where: { webhookId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.url !== undefined) row.url = input.url;
    if (input.events !== undefined) row.events = input.events;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    const saved = await repo.save(row);
    return SafeSystemWebhookSchema.parse(saved);
  }

  static async delete(webhookId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SystemWebhookEntity);
    const row = await repo.findOne({ where: { webhookId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);
    await repo.remove(row);
  }

  // ============================================================================
  // Dispatch — called from other system services
  // ============================================================================

  static async dispatchEvent(
    event: SystemWebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const ds = await getSystemDataSource();
      const webhooks = await ds.getRepository(SystemWebhookEntity).find({
        where: { isActive: true },
      });

      const matching = webhooks.filter((w) => w.events.includes(event));
      await Promise.all(matching.map((w) => SystemWebhookService._enqueueDelivery(w, event, payload)));
    } catch (err) {
      Logger.error(`[SystemWebhook] dispatchEvent failed event=${event}: ${err}`);
    }
  }

  private static async _enqueueDelivery(
    webhook: SystemWebhookEntity,
    event: SystemWebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const envelope = {
      webhookId: webhook.webhookId,
      event,
      createdAt: new Date().toISOString(),
      data: payload,
    };
    const requestBody = JSON.stringify(envelope);

    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SystemWebhookDeliveryEntity);

    const delivery = repo.create({
      webhookId: webhook.webhookId,
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

    const saved = await repo.save(delivery);

    await SystemWebhookService.QUEUE.add(
      'deliver',
      {
        deliveryId: saved.deliveryId,
        webhookId: webhook.webhookId,
        url: webhook.url,
        secret: webhook.secret,
        event,
        requestBody,
      },
      { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
    );
  }

  // ============================================================================
  // Redeliver
  // ============================================================================

  static async redeliver(webhookId: string, deliveryId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const deliveryRepo = ds.getRepository(SystemWebhookDeliveryEntity);
    const webhookRepo = ds.getRepository(SystemWebhookEntity);

    const delivery = await deliveryRepo.findOne({ where: { deliveryId, webhookId } });
    if (!delivery) throw new Error(WebhookMessages.DELIVERY_NOT_FOUND);

    const webhook = await webhookRepo.findOne({ where: { webhookId } });
    if (!webhook) throw new Error(WebhookMessages.NOT_FOUND);

    delivery.status = 'PENDING';
    delivery.attempts = 0;
    delivery.nextRetryAt = null;
    delivery.errorMessage = null;
    await deliveryRepo.save(delivery);

    await SystemWebhookService.QUEUE.add(
      'redeliver',
      {
        deliveryId: delivery.deliveryId,
        webhookId: webhook.webhookId,
        url: webhook.url,
        secret: webhook.secret,
        event: delivery.event,
        requestBody: delivery.requestBody,
      },
      { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
    );
  }

  // ============================================================================
  // Test — synchronous, no retry
  // ============================================================================

  static async sendTest(webhookId: string): Promise<WebhookDelivery> {
    const ds = await getSystemDataSource();
    const webhook = await ds.getRepository(SystemWebhookEntity).findOne({ where: { webhookId } });
    if (!webhook) throw new Error(WebhookMessages.NOT_FOUND);

    const envelope = {
      webhookId: webhook.webhookId,
      event: 'test',
      createdAt: new Date().toISOString(),
      data: { message: 'This is a test delivery from the system webhook.' },
    };
    const requestBody = JSON.stringify(envelope);

    const repo = ds.getRepository(SystemWebhookDeliveryEntity);
    const delivery = repo.create({
      webhookId: webhook.webhookId,
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

    const saved = await repo.save(delivery);

    await SystemWebhookService._executeDelivery({
      deliveryId: saved.deliveryId,
      webhookId: webhook.webhookId,
      url: webhook.url,
      secret: webhook.secret,
      event: 'test',
      requestBody,
    });

    const updated = await repo.findOne({ where: { deliveryId: saved.deliveryId } });
    return WebhookDeliverySchema.parse(updated!);
  }

  // ============================================================================
  // Deliveries
  // ============================================================================

  static async listDeliveries(
    { webhookId, page, pageSize }: Omit<ListDeliveriesInput, 'tenantId'>,
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const ds = await getSystemDataSource();
    const [rows, total] = await ds.getRepository(SystemWebhookDeliveryEntity).findAndCount({
      where: { webhookId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      deliveries: rows.map((r) => WebhookDeliverySchema.parse(r)),
      total,
    };
  }

  // ============================================================================
  // Internal HTTP delivery
  // ============================================================================

  private static async _executeDelivery(data: SystemDeliveryJobData): Promise<void> {
    const { deliveryId, url, secret, requestBody, event } = data;
    const signature = SystemWebhookService.signPayload(secret, requestBody);
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
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'NextBoilerplate-Webhooks/1.0',
        },
        body: requestBody,
        signal: AbortSignal.timeout(15_000),
      });

      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 4096);
      status = response.ok ? 'SUCCESS' : 'FAILED';
      if (!response.ok) errorMessage = `HTTP ${response.status}`;
    } catch (err: any) {
      errorMessage = err?.message ?? 'Unknown error';
    }

    const duration = Date.now() - startedAt;

    try {
      const ds = await getSystemDataSource();
      const repo = ds.getRepository(SystemWebhookDeliveryEntity);
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
      Logger.error(`[SystemWebhook] Failed to update delivery ${deliveryId}: ${err}`);
    }
  }
}
