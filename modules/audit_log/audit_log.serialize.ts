import type { AuditLog } from './audit_log.types';

/** Serialize rows to NDJSON (one JSON object per line). */
export function serializeForArchive(rows: AuditLog[]): string {
  return rows.map((r) => JSON.stringify(r)).join('\n');
}

/** Serialize rows to CSV with a fixed column order and RFC-4180 escaping. */
export function serializeForCsv(rows: AuditLog[]): string {
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
