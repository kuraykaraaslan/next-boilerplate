import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Webhook as WebhookEntity } from './entities/webhook.entity';
import { SafeWebhookSchema } from './webhook.types';
import type { SafeWebhook } from './webhook.types';
import type { CreateWebhookInput, UpdateWebhookInput, ListWebhooksInput } from './webhook.dto';
import { assertSafeWebhookUrlSync } from './webhook.ssrf';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import WebhookMessages from './webhook.messages';
import Logger from '@kuraykaraaslan/logger';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { generateSecret } from './webhook.crypto';

/** Lifecycle audit trail for webhook administration (best-effort). */
function auditWebhook(tenantId: string, actorId: string | null, action: string, webhookId: string, metadata?: Record<string, unknown>): void {
  AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    actorType: actorId ? 'USER' : 'SYSTEM',
    action,
    resourceType: 'Webhook',
    resourceId: webhookId,
    metadata: metadata ?? {},
  }).catch(() => {});
}

/**
 * Endpoint management for webhooks: CRUD plus signing-secret rotation. Split out
 * of {@link WebhookService} (which owns dispatch/delivery) so endpoint
 * administration stays self-contained. All inputs are SSRF-pre-checked.
 */
export default class WebhookCrudService {

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
    if (!row) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return SafeWebhookSchema.parse(row);
  }

  static async create(tenantId: string, createdByUserId: string, input: CreateWebhookInput): Promise<SafeWebhook> {
    // SSRF pre-check (no DNS) — instant feedback on obviously-internal targets.
    assertSafeWebhookUrlSync(input.url, input.ipAllowlist);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);

    const entity = repo.create({
      tenantId,
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      url: input.url,
      secret: generateSecret(),
      events: input.events,
      headers: input.headers ?? null,
      eventFilters: input.eventFilters ?? null,
      tags: input.tags ?? null,
      rateLimitPerMinute: input.rateLimitPerMinute ?? null,
      ipAllowlist: input.ipAllowlist ?? null,
      isActive: true,
    });

    const saved = await repo.save(entity);
    auditWebhook(tenantId, createdByUserId, 'webhook.created', saved.webhookId, { name: saved.name, url: saved.url, events: saved.events });
    return SafeWebhookSchema.parse(saved);
  }

  static async update(tenantId: string, webhookId: string, input: UpdateWebhookInput): Promise<SafeWebhook> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);

    const row = await repo.findOne({ where: { webhookId, tenantId } });
    if (!row) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    // Re-run the SSRF pre-check whenever the URL or allowlist changes.
    if (input.url !== undefined || input.ipAllowlist !== undefined) {
      assertSafeWebhookUrlSync(input.url ?? row.url, input.ipAllowlist ?? row.ipAllowlist);
    }

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.url !== undefined) row.url = input.url;
    if (input.events !== undefined) row.events = input.events;
    if (input.headers !== undefined) row.headers = input.headers;
    if (input.eventFilters !== undefined) row.eventFilters = input.eventFilters;
    if (input.tags !== undefined) row.tags = input.tags;
    if (input.rateLimitPerMinute !== undefined) row.rateLimitPerMinute = input.rateLimitPerMinute;
    if (input.ipAllowlist !== undefined) row.ipAllowlist = input.ipAllowlist;
    if (input.isActive !== undefined) {
      row.isActive = input.isActive;
      // Re-enabling (manually or after an auto-disable) clears the circuit breaker.
      if (input.isActive) {
        row.autoDisabledAt = null;
        row.consecutiveFailures = 0;
      }
    }

    const saved = await repo.save(row);
    auditWebhook(tenantId, null, 'webhook.updated', saved.webhookId, { fields: Object.keys(input), isActive: saved.isActive });
    return SafeWebhookSchema.parse(saved);
  }

  static async delete(tenantId: string, webhookId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookEntity);
    const row = await repo.findOne({ where: { webhookId, tenantId } });
    if (!row) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.remove(row);
    auditWebhook(tenantId, null, 'webhook.deleted', webhookId, { name: row.name });
  }

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
    if (!row) throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const newSecret = generateSecret();
    row.previousSecret = row.secret;
    row.previousSecretExpiresAt = new Date(Date.now() + overlapMs);
    row.secret = newSecret;

    const saved = await repo.save(row);
    auditWebhook(tenantId, null, 'webhook.secret_rotated', webhookId, { overlapMs });
    Logger.info(
      `[Webhook] Secret rotated for webhook=${webhookId} tenant=${tenantId} (overlap=${overlapMs}ms)`,
    );
    return { webhook: SafeWebhookSchema.parse(saved), newSecret };
  }
}
