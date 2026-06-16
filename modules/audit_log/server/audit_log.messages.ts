const AuditLogMessages = {
  NOT_FOUND:          'Audit log entry not found',
  INVALID_INPUT:      'Invalid audit log input',
  FETCH_FAILED:       'Failed to fetch audit logs',
  PURGE_FAILED:       'Failed to purge expired audit logs',
  ANONYMIZE_FAILED:   'Failed to anonymize actor in audit logs',
  EXPORT_FAILED:      'Failed to export audit logs',
  VERIFY_FAILED:      'Failed to verify the audit-log hash chain',
  ROOT_ONLY:          'This operation is restricted to the root (platform) tenant',
  ACTOR_REQUIRED:     'An actorId is required for this operation',
} as const;

export default AuditLogMessages;
