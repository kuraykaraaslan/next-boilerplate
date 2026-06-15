import 'reflect-metadata';
import { ILike, Between, LessThanOrEqual, MoreThanOrEqual, type FindOptionsWhere } from 'typeorm';
import { tenantDataSourceFor, getSystemDataSource } from '@/modules/db';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { AuditLog as AuditLogRow } from './entities/audit_log.entity';
import Logger from '@/modules/logger';
import { AuditLogSchema, type AuditLog, type ChainVerificationResult } from './audit_log.types';
import {
  GetAuditLogsDTO,
  ExportAuditLogsDTO,
  CrossTenantAuditQueryDTO,
  type GetAuditLogsInput,
  type ExportAuditLogsInput,
  type CrossTenantAuditQueryInput,
} from './audit_log.dto';
import { type AuditSeverity } from './audit_log.enums';
import AuditLogMessages from './audit_log.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { computeRowHash } from './audit_log.hash';
import { serializeForArchive, serializeForCsv } from './audit_log.serialize';

/** Apply an inclusive createdAt date-range to a where clause. */
export function applyDateRange(where: FindOptionsWhere<AuditLogRow>, from: Date | null, to: Date | null): void {
  if (from && to) where.createdAt = Between(from, to);
  else if (from) where.createdAt = MoreThanOrEqual(from);
  else if (to) where.createdAt = LessThanOrEqual(to);
}

export async function getAll(input: GetAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }> {
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
  applyDateRange(where, fromDate ?? null, toDate ?? null);

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
 * Right-to-access (GDPR Art. 15) + bulk export. Returns all (non-deleted)
 * rows matching the filter, serialized to CSV or NDJSON. Always tenant-scoped.
 * Pass an actorId for a per-user Subject Access Request export.
 */
export async function exportLogs(input: ExportAuditLogsInput): Promise<{ format: 'csv' | 'ndjson'; body: string; count: number }> {
  const parsed = ExportAuditLogsDTO.safeParse(input);
  if (!parsed.success) {
    throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
  }
  const { tenantId, actorId, fromDate, toDate, format } = parsed.data;

  const where: FindOptionsWhere<AuditLogRow> = { tenantId };
  if (actorId) where.actorId = actorId;
  applyDateRange(where, fromDate ?? null, toDate ?? null);

  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);
    const rows = await repo.find({ where, order: { createdAt: 'DESC' } });
    const logs = rows.map((r) => AuditLogSchema.parse(r));
    const body = format === 'csv' ? serializeForCsv(logs) : serializeForArchive(logs);
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
export async function verifyChain(tenantId: string): Promise<ChainVerificationResult> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AuditLogRow);
    const rows = await repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });

    let expectedPrev: string | null = null;
    for (const row of rows) {
      if ((row.prevHash ?? null) !== expectedPrev) {
        return { ok: false, checked: rows.length, brokenAt: row.auditLogId };
      }
      const recomputed = computeRowHash(expectedPrev, {
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
export async function queryCrossTenant(callerTenantId: string, input: CrossTenantAuditQueryInput) {
  if (!isRootTenant(callerTenantId)) {
    throw new AppError(AuditLogMessages.ROOT_ONLY, 403, ErrorCode.FORBIDDEN);
  }
  const parsed = CrossTenantAuditQueryDTO.safeParse(input);
  if (!parsed.success) {
    throw new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION_ERROR);
  }
  const { tenantId: filterTenantId, action, severity, fromDate, toDate, page, pageSize } = parsed.data;

  try {
    const systemDs = await getSystemDataSource();
    const allTenants = await systemDs.getRepository(Tenant).find();
    // When a tenant filter is supplied, scope the scan to just that tenant.
    const scope = filterTenantId
      ? allTenants.filter((t) => t.tenantId === filterTenantId)
      : allTenants;
    const tenantNameMap = Object.fromEntries(allTenants.map((t) => [t.tenantId, t.name]));

    // For a global page N we never need more than offset+pageSize rows from any
    // single tenant, so fetch that many per tenant, merge-sort, then slice.
    const need = page * pageSize;

    const aggregated: (AuditLog & { tenant: { tenantId: string; name: string } })[] = [];
    let total = 0;
    for (const tenant of scope) {
      const where: FindOptionsWhere<AuditLogRow> = { tenantId: tenant.tenantId };
      if (action) where.action = ILike(`%${action}%`);
      if (severity) where.severity = severity;
      applyDateRange(where, fromDate ?? null, toDate ?? null);

      const ds = await tenantDataSourceFor(tenant.tenantId);
      const repo = ds.getRepository(AuditLogRow);
      const [rows, count] = await Promise.all([
        repo.find({ where, order: { createdAt: 'DESC' }, take: need }),
        repo.count({ where }),
      ]);
      total += count;
      for (const r of rows) {
        aggregated.push({
          ...AuditLogSchema.parse(r),
          tenant: { tenantId: tenant.tenantId, name: tenantNameMap[tenant.tenantId] ?? tenant.tenantId },
        });
      }
    }

    aggregated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = (page - 1) * pageSize;
    const logs = aggregated.slice(offset, offset + pageSize);
    return { logs, total };
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error(`[AuditLog] queryCrossTenant failed: ${error instanceof Error ? error.message : String(error)}`);
    throw new AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}
