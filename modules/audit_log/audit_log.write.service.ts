import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { LessThanOrEqual } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { AuditLog as AuditLogRow } from './entities/audit_log.entity';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import { AuditLogSchema, type AuditArchiveExporter } from './audit_log.types';
import {
  CreateAuditLogDTO,
  PurgeAuditLogsDTO,
  AnonymizeActorDTO,
  type CreateAuditLogInput,
  type PurgeAuditLogsInput,
  type AnonymizeActorInput,
} from './audit_log.dto';
import { severityForAction, HIGH_RISK_SEVERITIES, type AuditSeverity } from './audit_log.enums';
import { AUDIT_LOG_SETTING_KEYS, RETENTION_KEEP_FOREVER } from './audit_log.setting.keys';
import AuditLogMessages from './audit_log.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { computeRowHash, scrubMetadata } from './audit_log.hash';
import { serializeForArchive } from './audit_log.serialize';

/** Read the tenant's retention window (days). 0 / unset = keep forever. */
async function getRetentionDays(tenantId: string): Promise<number> {
  const raw = await SettingService.getValue(tenantId, AUDIT_LOG_SETTING_KEYS.RETENTION_DAYS);
  if (raw == null) return RETENTION_KEEP_FOREVER;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : RETENTION_KEEP_FOREVER;
}

/**
 * Write an audit-log row. Every log belongs to a tenant; when the caller
 * omits `tenantId` we fall back to the platform tenant (`ROOT_TENANT_ID`)
 * so platform-level events still land in a real tenant's audit table.
 *
 * Computes the per-tenant append-only hash chain (prevHash/rowHash) and, for
 * high-risk severities, fires a best-effort `audit.high_risk` webhook.
 * Never throws — failures are caught and logged so auditing can't break the
 * calling operation.
 */
export async function log(input: CreateAuditLogInput): Promise<void> {
  try {
    const data = CreateAuditLogDTO.parse(input);
    const tenantId = data.tenantId ?? ROOT_TENANT_ID;
    const { tenantId: _ignored, severity: severityOverride, ...rest } = data;
    const severity: AuditSeverity = severityOverride ?? severityForAction(data.action);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);

    // Append-only hash chain: link to the previous (non-deleted) row's hash.
    const prev = await repo.findOne({ where: { tenantId }, order: { createdAt: 'DESC' } });
    const prevHash = prev?.rowHash ?? null;
    const createdAt = new Date();
    const rowHash = computeRowHash(prevHash, {
      tenantId,
      actorId: rest.actorId ?? null,
      actorType: rest.actorType,
      onBehalfOfActorId: rest.onBehalfOfActorId ?? null,
      action: rest.action,
      severity,
      resourceType: rest.resourceType ?? null,
      resourceId: rest.resourceId ?? null,
      metadata: rest.metadata ?? null,
      createdAt,
    });

    await repo.save(repo.create({ ...rest, tenantId, severity, prevHash, rowHash, createdAt } as Partial<AuditLogRow>));

    Logger.info(
      `[AUDIT] ${data.actorType}:${data.actorId ?? 'system'}` +
      (data.onBehalfOfActorId ? ` (on behalf of ${data.onBehalfOfActorId})` : '') +
      ` → ${data.action} [${severity}]` +
      (data.resourceType ? ` on ${data.resourceType}:${data.resourceId ?? '?'}` : '') +
      ` [tenant:${tenantId}]`
    );

    // Real-time alert on high-risk events. Fire-and-forget — a webhook failure
    // must never break the audit write.
    if (HIGH_RISK_SEVERITIES.includes(severity)) {
      void WebhookService.dispatchEvent(tenantId, 'audit.high_risk', {
        action: data.action,
        severity,
        actorId: data.actorId ?? null,
        actorType: data.actorType,
        onBehalfOfActorId: data.onBehalfOfActorId ?? null,
        resourceType: data.resourceType ?? null,
        resourceId: data.resourceId ?? null,
        tenantId,
        occurredAt: createdAt.toISOString(),
      }).catch((err: unknown) => {
        Logger.error(`[AUDIT] high_risk webhook dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  } catch (err: unknown) {
    Logger.error(`[AUDIT] Failed to write audit log: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Per-tenant configurable retention purge. Deletes (hard-deletes) rows older
 * than the tenant's `auditLogRetentionDays` window. 0 / unset = keep forever
 * → no-op. Optionally serializes the doomed batch to NDJSON before deletion
 * (archive-before-delete); when an exporter is provided it receives the batch
 * before the hard delete, otherwise the NDJSON is returned to the caller.
 */
export async function purgeExpired(
  input: PurgeAuditLogsInput,
  exporter?: AuditArchiveExporter,
): Promise<{ purged: number; cutoff: Date | null; archive: string | null }> {
  const parsed = PurgeAuditLogsDTO.safeParse(input);
  if (!parsed.success) {
    throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
  }
  const { tenantId, archive: doArchive } = parsed.data;

  try {
    const retentionDays = await getRetentionDays(tenantId);
    if (retentionDays <= RETENTION_KEEP_FOREVER) {
      return { purged: 0, cutoff: null, archive: null };
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);

    const doomed = await repo.find({ where: { tenantId, createdAt: LessThanOrEqual(cutoff) }, order: { createdAt: 'ASC' } });
    if (doomed.length === 0) return { purged: 0, cutoff, archive: null };

    let archive: string | null = null;
    if (doArchive) {
      const ndjson = serializeForArchive(doomed.map((r) => AuditLogSchema.parse(r)));
      if (exporter) {
        await exporter.export(tenantId, ndjson, doomed.length);
      } else {
        archive = ndjson;
      }
    }

    // Hard delete after archive (purge bypasses the soft-delete guard).
    await repo.delete(doomed.map((r) => r.auditLogId));
    Logger.info(`[AuditLog] purgeExpired tenant=${tenantId} purged=${doomed.length} cutoff=${cutoff.toISOString()}`);
    return { purged: doomed.length, cutoff, archive };
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error(`[AuditLog] purgeExpired failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new AppError(AuditLogMessages.PURGE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Right-to-erasure (GDPR Art. 17): pseudonymize an actor across the tenant's
 * audit trail. Nulls `actorId` / `onBehalfOfActorId`, stores a stable hash of
 * the erased id for correlation, and scrubs PII-ish metadata — while
 * preserving the row + action (audit completeness).
 */
export async function anonymizeActor(input: AnonymizeActorInput): Promise<{ anonymized: number }> {
  const parsed = AnonymizeActorDTO.safeParse(input);
  if (!parsed.success) {
    throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
  }
  const { tenantId, actorId } = parsed.data;

  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);
    const pseudonym = `anon:${createHash('sha256').update(actorId).digest('hex').slice(0, 32)}`;

    const rows = await repo.find({
      where: [
        { tenantId, actorId },
        { tenantId, onBehalfOfActorId: actorId },
      ],
    });
    if (rows.length === 0) return { anonymized: 0 };

    for (const row of rows) {
      if (row.actorId === actorId) row.actorId = null;
      if (row.onBehalfOfActorId === actorId) row.onBehalfOfActorId = null;
      row.metadata = scrubMetadata(row.metadata);
      const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, unknown> : {};
      row.metadata = { ...meta, anonymizedActor: pseudonym, anonymizedAt: new Date().toISOString() };
      row.ipAddress = null;
      row.userAgent = null;
    }
    await repo.save(rows);
    Logger.info(`[AuditLog] anonymizeActor tenant=${tenantId} rows=${rows.length}`);
    return { anonymized: rows.length };
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error(`[AuditLog] anonymizeActor failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new AppError(AuditLogMessages.ANONYMIZE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}
