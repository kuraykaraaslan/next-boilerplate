import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { isReservedHeaderName } from './webhook.dto';
import { assertSafeWebhookUrl } from './webhook.ssrf';
import Logger from '@nb/logger';
import { TenantUsageService } from '@nb/tenant_usage/server/tenant_usage.service';
import { signPayload } from './webhook.crypto';
import { resolveDeliveryConfig, RETRY_DELAYS_MS, type DeliveryJobData } from './webhook.config';

/**
 * Webhook HTTP delivery engine: performs the signed POST (SSRF-checked, v1+v2
 * signatures), records the delivery outcome, schedules retries / dead-letters
 * exhausted deliveries, and drives the per-endpoint circuit breaker. Invoked by
 * the BullMQ worker (see `webhook.queue.ts`) and by `WebhookService.sendTest`.
 */
export default class WebhookDeliveryService {

  static async execute(data: DeliveryJobData): Promise<void> {
    const { deliveryId, tenantId, url, secret, previousSecret, requestBody } = data;
    const config = await resolveDeliveryConfig(tenantId);

    // v1 (legacy): HMAC over the raw body. v2 (replay-resistant, Stripe-style):
    // HMAC over `${timestamp}.${body}` with the timestamp also sent as a header so
    // the receiver can reject stale deliveries. Both are sent during a deprecation
    // window so existing v1 verifiers keep working.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedV2 = `${timestamp}.${requestBody}`;
    const signature = signPayload(secret, requestBody);
    const signatureV2 = signPayload(secret, signedV2);
    const previousSignature = previousSecret ? signPayload(previousSecret, requestBody) : null;
    const previousSignatureV2 = previousSecret ? signPayload(previousSecret, signedV2) : null;
    const startedAt = Date.now();

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let status: 'SUCCESS' | 'FAILED' = 'FAILED';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Signature-V2': signatureV2,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': data.event,
      'X-Webhook-Delivery': deliveryId,
      'User-Agent': 'NextBoilerplate-Webhooks/1.0',
    };
    if (previousSignature) {
      headers['X-Webhook-Signature-Prev'] = previousSignature;
    }
    if (previousSignatureV2) {
      headers['X-Webhook-Signature-V2-Prev'] = previousSignatureV2;
    }
    // Merge per-endpoint custom headers, dropping any reserved name as a second
    // line of defence behind the DTO validation (a header could have been
    // persisted before validation tightened, or set out-of-band).
    if (data.headers) {
      for (const [key, value] of Object.entries(data.headers)) {
        if (!isReservedHeaderName(key)) headers[key] = value;
      }
    }

    try {
      // Authoritative SSRF check at delivery time (resolves DNS now, so it is
      // resistant to rebinding between create and delivery).
      await assertSafeWebhookUrl(url, data.ipAllowlist);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: requestBody,
        // Do not follow redirects — prevents an endpoint from bouncing a delivery
        // to a private/internal address (SSRF via redirect / DNS rebinding).
        redirect: 'manual',
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 4096);
      status = response.ok ? 'SUCCESS' : 'FAILED';

      // Count the delivery attempt toward the tenant's monthly usage.
      TenantUsageService.incrementWebhookCall(tenantId).catch(() => {});

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
          // Recoverable failure — schedule next retry using the per-tenant backoff.
          const delay = config.retryDelaysMs[row.attempts - 1] ?? config.retryDelaysMs.at(-1) ?? RETRY_DELAYS_MS.at(-1)!;
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

      // Circuit breaker: a successful attempt resets the counter; repeated
      // failures eventually auto-disable the endpoint.
      await WebhookDeliveryService.applyCircuitBreaker(ds, tenantId, data.webhookId, status === 'SUCCESS', config.circuitBreakerThreshold);
    } catch (err) {
      Logger.error(`[Webhook] Failed to update delivery record ${deliveryId}: ${err}`);
    }
  }

  /**
   * Track consecutive failed deliveries per endpoint and auto-disable an endpoint
   * once it crosses the circuit-breaker threshold. A success resets the counter.
   * Best-effort — a failure here must not break delivery recording.
   */
  private static async applyCircuitBreaker(
    ds: DataSource,
    tenantId: string,
    webhookId: string,
    success: boolean,
    threshold: number,
  ): Promise<void> {
    try {
      const repo = ds.getRepository(WebhookEntity);
      const webhook = await repo.findOne({ where: { webhookId, tenantId } });
      if (!webhook) return;

      if (success) {
        if ((webhook.consecutiveFailures ?? 0) !== 0) {
          webhook.consecutiveFailures = 0;
          await repo.save(webhook);
        }
        return;
      }

      webhook.consecutiveFailures = (webhook.consecutiveFailures ?? 0) + 1;
      if (webhook.isActive && webhook.consecutiveFailures >= threshold) {
        webhook.isActive = false;
        webhook.autoDisabledAt = new Date();
        Logger.warn(
          `[Webhook] Endpoint ${webhookId} auto-disabled after ${webhook.consecutiveFailures} consecutive failures (tenant=${tenantId})`,
        );
      }
      await repo.save(webhook);
    } catch (err) {
      Logger.error(`[Webhook] circuit-breaker update failed for webhook=${webhookId}: ${err}`);
    }
  }
}
