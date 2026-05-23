import 'reflect-metadata';
import crypto from 'crypto';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/modules/redis/redis.bullmq';
import { tenantDataSourceFor } from '@/modules/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { SafeWebhookSchema, WebhookDeliverySchema } from './webhook.types';
import type { SafeWebhook, WebhookDelivery } from './webhook.types';
import type { CreateWebhookInput, UpdateWebhookInput, ListWebhooksInput, ListDeliveriesInput } from './webhook.dto';
import type { WebhookEvent } from './webhook.enums';
import WebhookMessages from './webhook.messages';
import Logger from '@/modules/logger';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant } from '@/modules/tenant/tenant.constants';

interface DeliveryJobData {
  deliveryId: string;
  tenantId: string;
  webhookId: string;
  url: string;
  secret: string;
  /** Set during a secret-rotation window; receivers can use either signature. */
  previousSecret?: string | null;
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

  /**
   * Defense-in-depth billing gate for webhooks. Tenants without the
   * `feature_webhooks` BOOLEAN feature on their active plan are skipped
   * silently — no enqueue, no audit row. Root tenant is short-circuited.
   *
   * Uses checkFeatureAccess (not assert) because dispatchEvent is called
   * from many event producers and must never propagate a 402 to a
   * non-billing code path.
   */
  private static async hasWebhookFeature(tenantId: string): Promise<boolean> {
    if (isRootTenant(tenantId)) return true;
    try {
      const result = await TenantSubscriptionService.checkFeatureAccess(
        tenantId,
        FEATURE_KEYS.FEATURE_WEBHOOKS,
      );
      return result.allowed;
    } catch (err) {
      Logger.warn(
        `[Webhook] hasWebhookFeature check failed for tenant=${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  static async dispatchEvent(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Skip enqueue entirely when the tenant plan does not include webhooks.
      // Best-effort billing: a plan downgrade between dispatch and worker pick
      // is still caught at delivery time by the same check, but is
      // intentionally not atomic.
      if (!(await WebhookService.hasWebhookFeature(tenantId))) {
        return;
      }

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

    // Drop the rotation overlap secret if it expired.
    const previousSecret =
      webhook.previousSecret &&
      webhook.previousSecretExpiresAt &&
      webhook.previousSecretExpiresAt > new Date()
        ? webhook.previousSecret
        : null;

    await WebhookService.QUEUE.add(
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

    const previousSecret =
      webhook.previousSecret &&
      webhook.previousSecretExpiresAt &&
      webhook.previousSecretExpiresAt > new Date()
        ? webhook.previousSecret
        : null;

    await WebhookService.QUEUE.add(
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
      },
      { attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } },
    );
  }

  // ============================================================================
  // Secret rotation
  // ============================================================================

  /**
   * Rotate a webhook's signing secret. The previous secret is kept valid for
   * `overlapMs` (default 48h) so subscribers can swap without dropped events;
   * outgoing requests carry both the new `X-Webhook-Signature` and the
   * `X-Webhook-Signature-Prev` header during the window. Returns the new secret
   * exactly once — callers MUST display it immediately and never persist it.
   */
  static async rotateSecret(
    tenantId: string,
    webhookId: string,
    overlapMs: number = 48 * 60 * 60 * 1000,
  ): Promise<{ webhook: SafeWebhook; newSecret: string }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);

    const row = await repo.findOne({ where: { webhookId, tenantId } });
    if (!row) throw new Error(WebhookMessages.NOT_FOUND);

    const newSecret = WebhookService.generateSecret();
    row.previousSecret = row.secret;
    row.previousSecretExpiresAt = new Date(Date.now() + overlapMs);
    row.secret = newSecret;

    const saved = await repo.save(row);
    Logger.info(
      `[Webhook] Secret rotated for webhook=${webhookId} tenant=${tenantId} (overlap=${overlapMs}ms)`,
    );
    return { webhook: SafeWebhookSchema.parse(saved), newSecret };
  }

  // ============================================================================
  // Dead-letter queue helpers
  // ============================================================================

  /**
   * Replay every dead-lettered delivery for a webhook. Each one is re-queued
   * with attempts reset to 0 and `status = PENDING`. Useful after the
   * subscriber endpoint comes back online.
   */
  static async replayDeadLettered(tenantId: string, webhookId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookDeliveryEntity);
    const dead = await repo.find({
      where: { tenantId, webhookId, status: 'DEAD_LETTERED' },
      order: { createdAt: 'ASC' },
    });
    for (const d of dead) {
      await WebhookService.redeliver(tenantId, webhookId, d.deliveryId);
    }
    return dead.length;
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
    const { deliveryId, tenantId, url, secret, previousSecret, requestBody } = data;
    const signature = WebhookService.signPayload(secret, requestBody);
    const previousSignature = previousSecret
      ? WebhookService.signPayload(previousSecret, requestBody)
      : null;
    const startedAt = Date.now();

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let status: 'SUCCESS' | 'FAILED' = 'FAILED';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': data.event,
      'X-Webhook-Delivery': deliveryId,
      'User-Agent': 'NextBoilerplate-Webhooks/1.0',
    };
    if (previousSignature) {
      headers['X-Webhook-Signature-Prev'] = previousSignature;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
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

      if (status === 'FAILED') {
        if (row.attempts < row.maxAttempts) {
          // Recoverable failure — schedule next retry.
          const delay = RETRY_DELAYS_MS[row.attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;
          row.nextRetryAt = new Date(Date.now() + delay);
          row.status = 'PENDING';
        } else {
          // All retries exhausted — move to the dead-letter queue. Stays
          // queryable for admins to inspect or replay manually via
          // WebhookService.redeliver().
          row.status = 'DEAD_LETTERED';
          row.nextRetryAt = null;
          Logger.warn(
            `[Webhook] Delivery ${deliveryId} dead-lettered after ${row.attempts} attempts (tenant=${tenantId})`,
          );
        }
      }

      await repo.save(row);
    } catch (err) {
      Logger.error(`[Webhook] Failed to update delivery record ${deliveryId}: ${err}`);
    }
  }
}
