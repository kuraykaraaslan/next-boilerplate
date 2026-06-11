import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { ILike, Between, LessThanOrEqual, MoreThanOrEqual, type FindOptionsWhere } from 'typeorm';
import { tenantDataSourceFor, getSystemDataSource } from '@/modules/db';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { AuditLog as AuditLogRow } from './entities/audit_log.entity';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import { AuditLogSchema, type AuditLog, type ChainVerificationResult, type AuditArchiveExporter } from './audit_log.types';
import {
  CreateAuditLogDTO,
  GetAuditLogsDTO,
  PurgeAuditLogsDTO,
  ExportAuditLogsDTO,
  AnonymizeActorDTO,
  CrossTenantAuditQueryDTO,
  type CreateAuditLogInput,
  type GetAuditLogsInput,
  type PurgeAuditLogsInput,
  type ExportAuditLogsInput,
  type AnonymizeActorInput,
  type CrossTenantAuditQueryInput,
} from './audit_log.dto';
import { severityForAction, HIGH_RISK_SEVERITIES, type AuditSeverity } from './audit_log.enums';
import { AUDIT_LOG_SETTING_KEYS, RETENTION_KEEP_FOREVER } from './audit_log.setting.keys';
import AuditLogMessages from './audit_log.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

// PII-ish metadata keys scrubbed during right-to-erasure anonymization. Kept as
// a small constant so the policy is auditable in one place.
const PII_METADATA_KEYS = ['email', 'name', 'fullName', 'firstName', 'lastName', 'phone', 'reason', 'ip', 'ipAddress'] as const;

export default class AuditLogService {

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
  static async log(input: CreateAuditLogInput): Promise<void> {
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
      const rowHash = AuditLogService.computeRowHash(prevHash, {
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

  static async getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
    const parsed = GetAuditLogsDTO.safeParse(input);
    if (!parsed.success) {
      throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
    }
    const { tenantId: rawTenantId, actorId, action, severity, resourceType, resourceId, fromDate, toDate, page, pageSize } = parsed.data;
    const tenantId = rawTenantId ?? ROOT_TENANT_ID;

    const where: FindOptionsWhere<AuditLogRow> = { tenantId };
    if (actorId) where.actorId = actorId;
    if (action) where.action = ILike(`%${action}%`);
    if (severity) where.severity = severity;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    AuditLogService.applyDateRange(where, fromDate ?? null, toDate ?? null);

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AuditLogRow);
      // find/count exclude soft-deleted rows automatically (DeleteDateColumn).
      const [rows, total] = await Promise.all([
        repo.find({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize }),
        repo.count({ where }),
      ]);
      return { logs: rows.map((r) => AuditLogSchema.parse(r)), total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`[AuditLog] getAll failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Per-tenant configurable retention purge. Deletes (hard-deletes) rows older
   * than the tenant's `auditLogRetentionDays` window. 0 / unset = keep forever
   * → no-op. Optionally serializes the doomed batch to NDJSON before deletion
   * (archive-before-delete); when an exporter is provided it receives the batch
   * before the hard delete, otherwise the NDJSON is returned to the caller.
   */
  static async purgeExpired(
    input: PurgeAuditLogsInput,
    exporter?: AuditArchiveExporter,
  ): Promise<{ purged: number; cutoff: Date | null; archive: string | null }> {
    const parsed = PurgeAuditLogsDTO.safeParse(input);
    if (!parsed.success) {
      throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
    }
    const { tenantId, archive: doArchive } = parsed.data;

    try {
      const retentionDays = await AuditLogService.getRetentionDays(tenantId);
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
        const ndjson = AuditLogService.serializeForArchive(doomed.map((r) => AuditLogSchema.parse(r)));
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
  static async anonymizeActor(input: AnonymizeActorInput): Promise<{ anonymized: number }> {
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
        row.metadata = AuditLogService.scrubMetadata(row.metadata);
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

  /**
   * Right-to-access (GDPR Art. 15) + bulk export. Returns all (non-deleted)
   * rows matching the filter, serialized to CSV or NDJSON. Always tenant-scoped.
   * Pass an actorId for a per-user Subject Access Request export.
   */
  static async exportLogs(input: ExportAuditLogsInput): Promise<{ format: 'csv' | 'ndjson'; body: string; count: number }> {
    const parsed = ExportAuditLogsDTO.safeParse(input);
    if (!parsed.success) {
      throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
    }
    const { tenantId, actorId, fromDate, toDate, format } = parsed.data;

    const where: FindOptionsWhere<AuditLogRow> = { tenantId };
    if (actorId) where.actorId = actorId;
    AuditLogService.applyDateRange(where, fromDate ?? null, toDate ?? null);

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AuditLogRow);
      const rows = await repo.find({ where, order: { createdAt: 'DESC' } });
      const logs = rows.map((r) => AuditLogSchema.parse(r));
      const body = format === 'csv' ? AuditLogService.serializeForCsv(logs) : AuditLogService.serializeForArchive(logs);
      return { format, body, count: logs.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`[AuditLog] exportLogs failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(AuditLogMessages.EXPORT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Verify the append-only hash chain for a tenant. Recomputes each row's hash
   * from the previous row's stored rowHash + canonical content and confirms the
   * chain links match. Detects tampering / deletion within the kept window.
   */
  static async verifyChain(tenantId: string): Promise<ChainVerificationResult> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AuditLogRow);
      const rows = await repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });

      let expectedPrev: string | null = null;
      for (const row of rows) {
        if ((row.prevHash ?? null) !== expectedPrev) {
          return { ok: false, checked: rows.length, brokenAt: row.auditLogId };
        }
        const recomputed = AuditLogService.computeRowHash(expectedPrev, {
          tenantId: row.tenantId,
          actorId: row.actorId ?? null,
          actorType: row.actorType,
          onBehalfOfActorId: row.onBehalfOfActorId ?? null,
          action: row.action,
          severity: row.severity as AuditSeverity,
          resourceType: row.resourceType ?? null,
          resourceId: row.resourceId ?? null,
          metadata: row.metadata ?? null,
          createdAt: row.createdAt,
        });
        if (recomputed !== (row.rowHash ?? null)) {
          return { ok: false, checked: rows.length, brokenAt: row.auditLogId };
        }
        expectedPrev = row.rowHash ?? null;
      }
      return { ok: true, checked: rows.length, brokenAt: null };
    } catch (error) {
      Logger.error(`[AuditLog] verifyChain failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(AuditLogMessages.VERIFY_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /**
   * Cross-tenant aggregated view — root tenant only. Queries every active
   * tenant's audit table for matching events within a time window. Used by the
   * platform security team for cross-tenant incident investigation.
   */
  static async queryCrossTenant(
    callerTenantId: string,
    input: CrossTenantAuditQueryInput,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    if (!isRootTenant(callerTenantId)) {
      throw new AppError(AuditLogMessages.ROOT_ONLY, 403, ErrorCode.FORBIDDEN);
    }
    const parsed = CrossTenantAuditQueryDTO.safeParse(input);
    if (!parsed.success) {
      throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
    }
    const { action, severity, fromDate, toDate, limit } = parsed.data;

    try {
      const systemDs = await getSystemDataSource();
      const tenants = await systemDs.getRepository(Tenant).find();

      const aggregated: AuditLog[] = [];
      for (const tenant of tenants) {
        const where: FindOptionsWhere<AuditLogRow> = { tenantId: tenant.tenantId };
        if (action) where.action = ILike(`%${action}%`);
        if (severity) where.severity = severity;
        AuditLogService.applyDateRange(where, fromDate ?? null, toDate ?? null);

        const ds = await tenantDataSourceFor(tenant.tenantId);
        const rows = await ds.getRepository(AuditLogRow).find({ where, order: { createdAt: 'DESC' }, take: limit });
        for (const r of rows) aggregated.push(AuditLogSchema.parse(r));
      }

      aggregated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const sliced = aggregated.slice(0, limit);
      return { logs: sliced, total: aggregated.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`[AuditLog] queryCrossTenant failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Read the tenant's retention window (days). 0 / unset = keep forever. */
  private static async getRetentionDays(tenantId: string): Promise<number> {
    const raw = await SettingService.getValue(tenantId, AUDIT_LOG_SETTING_KEYS.RETENTION_DAYS);
    if (raw == null) return RETENTION_KEEP_FOREVER;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : RETENTION_KEEP_FOREVER;
  }

  /** Apply an inclusive createdAt date-range to a where clause. */
  private static applyDateRange(where: FindOptionsWhere<AuditLogRow>, from: Date | null, to: Date | null): void {
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);
  }

  /**
   * Deterministic SHA-256 over the canonical row content chained to prevHash.
   * Canonicalization sorts metadata keys so the same logical row always hashes
   * identically regardless of key insertion order.
   */
  static computeRowHash(
    prevHash: string | null,
    row: {
      tenantId: string;
      actorId: string | null;
      actorType: string;
      onBehalfOfActorId: string | null;
      action: string;
      severity: string;
      resourceType: string | null;
      resourceId: string | null;
      metadata: unknown;
      createdAt: Date;
    },
  ): string {
    const canonical = JSON.stringify({
      tenantId: row.tenantId,
      actorId: row.actorId,
      actorType: row.actorType,
      onBehalfOfActorId: row.onBehalfOfActorId,
      action: row.action,
      severity: row.severity,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      metadata: AuditLogService.canonicalize(row.metadata),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    });
    return createHash('sha256').update((prevHash ?? '') + canonical).digest('hex');
  }

  /** Recursively sort object keys so JSON.stringify is order-independent. */
  private static canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => AuditLogService.canonicalize(v));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        out[key] = AuditLogService.canonicalize((value as Record<string, unknown>)[key]);
      }
      return out;
    }
    return value;
  }

  /**
   * Consent-aware metadata scrubbing: strip common PII keys (recursively) while
   * preserving structural/non-PII fields. Applied during anonymizeActor.
   */
  static scrubMetadata(metadata: unknown): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const piiSet = new Set<string>(PII_METADATA_KEYS as readonly string[]);
    const scrub = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(scrub);
      if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (piiSet.has(k)) continue; // drop PII key entirely
          out[k] = scrub(v);
        }
        return out;
      }
      return value;
    };
    return scrub(metadata) as Record<string, unknown>;
  }

  /** Serialize rows to NDJSON (one JSON object per line). */
  static serializeForArchive(rows: AuditLog[]): string {
    return rows.map((r) => JSON.stringify(r)).join('\n');
  }

  /** Serialize rows to CSV with a fixed column order and RFC-4180 escaping. */
  static serializeForCsv(rows: AuditLog[]): string {
    const cols: (keyof AuditLog)[] = [
      'auditLogId', 'tenantId', 'actorId', 'actorType', 'onBehalfOfActorId',
      'action', 'severity', 'resourceType', 'resourceId', 'ipAddress', 'userAgent', 'createdAt',
    ];
    const esc = (v: unknown): string => {
      if (v == null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(',');
    const lines = rows.map((r) => cols.map((c) => esc(r[c])).join(','));
    return [header, ...lines].join('\n');
  }
}
