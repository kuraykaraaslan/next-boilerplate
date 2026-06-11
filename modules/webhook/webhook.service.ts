import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { WebhookDeliverySchema } from './webhook.types';
import type { WebhookDelivery, WebhookMetrics } from './webhook.types';
import type { ListDeliveriesInput } from './webhook.dto';
import type { WebhookEvent } from './webhook.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookMessages from './webhook.messages';
import Logger from '@/modules/logger';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant, ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { signPayload, generateSecret } from './webhook.crypto';
import { passesEventFilter } from './webhook.filters';
import { MAX_ATTEMPTS, type DeliveryJobData } from './webhook.config';
import { webhookQueue, enqueueDelivery } from './webhook.queue';
import WebhookDeliveryService from './webhook.delivery.service';
import WebhookMetricsService from './webhook.metrics.service';

/**
 * Public coordinator for the webhook subsystem: endpoint CRUD, event dispatch,
 * secret rotation, manual (re)delivery, and reporting. The heavy machinery is
 * delegated to focused collaborators — HTTP delivery + circuit breaker
 * (`WebhookDeliveryService`), the BullMQ producer/worker (`webhook.queue.ts`),
 * delivery tuning (`webhook.config.ts`), reporting (`WebhookMetricsService`),
 * payload filters (`webhook.filters.ts`) and signing (`webhook.crypto.ts`).
 */
export default class WebhookService {
  /** Shared producer handle (the queue + worker live in `webhook.queue.ts`). */
  static readonly QUEUE = webhookQueue;

  // ============================================================================
  // HMAC signature
  // ============================================================================

  static signPayload(secret: string, body: string): string {
    return signPayload(secret, body);
  }

  static generateSecret(): string {
    return generateSecret();
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
      const result = await TenantFeatureGateService.checkFeatureAccess(
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

      const matching = webhooks.filter(
        (w) => w.events.includes(event) && passesEventFilter(w, event, payload),
      );
      await Promise.all(matching.map((w) => enqueueDelivery(w, event, payload)));
    } catch (err) {
      Logger.error(`[Webhook] dispatchEvent failed for tenant=${tenantId} event=${event}: ${err}`);
    }
  }

  /**
   * Dispatch a platform-wide event (user.*, tenant.*, plan.*, subscription.assigned)
   * to root-tenant webhooks. Thin wrapper over {@link dispatchEvent} pinned to
   * {@link ROOT_TENANT_ID} — platform producers call this instead of threading the
   * root tenant id through every call site. Fire-and-forget; never throws.
   */
  static async dispatchPlatformEvent(
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return WebhookService.dispatchEvent(ROOT_TENANT_ID, event, payload);
  }

  // ============================================================================
  // Redeliver a failed delivery
  // ============================================================================

  static async redeliver(tenantId: string, webhookId: string, deliveryId: string): Promise<void> {
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
  static async triggerEvent(
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

  // ============================================================================
  // Deliveries list + metrics (delegated to WebhookMetricsService)
  // ============================================================================

  static async listDeliveries(input: ListDeliveriesInput): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    return WebhookMetricsService.listDeliveries(input);
  }

  static async getMetrics(
    tenantId: string,
    opts: { webhookId?: string; since?: Date } = {},
  ): Promise<WebhookMetrics> {
    return WebhookMetricsService.getMetrics(tenantId, opts);
  }
}
