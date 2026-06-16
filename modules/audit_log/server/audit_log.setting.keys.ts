import { z } from 'zod';

// Canonical per-tenant setting keys for the audit_log module. Centralised so the
// service (runtime enforcement: retention purge) and the settings-fields file
// (admin UI) never drift apart.
//
// auditLogRetentionDays — number of days to keep audit rows before they become
//   eligible for the retention purge. 0 (the default) = keep forever, matching
//   the module's historical keep-forever behaviour.
export const AuditLogSettingKeySchema = z.enum([
  'auditLogRetentionDays',
]);
export type AuditLogSettingKey = z.infer<typeof AuditLogSettingKeySchema>;
export const AUDIT_LOG_SETTING_KEY_LIST = AuditLogSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const AUDIT_LOG_SETTING_KEYS = {
  RETENTION_DAYS: 'auditLogRetentionDays',
} as const satisfies Record<string, AuditLogSettingKey>;

// Sentinel used when a tenant has no retention setting → keep forever.
export const RETENTION_KEEP_FOREVER = 0;
