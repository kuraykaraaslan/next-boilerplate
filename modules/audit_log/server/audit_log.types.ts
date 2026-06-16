import { z } from 'zod';
import { AuditActorTypeEnum, AuditSeverityEnum } from './audit_log.enums';

export const AuditLogSchema = z.object({
  auditLogId:        z.string().uuid(),
  tenantId:          z.string().uuid(),
  actorId:           z.string().uuid().nullable(),
  actorType:         AuditActorTypeEnum,
  onBehalfOfActorId: z.string().uuid().nullable().optional().default(null),
  action:            z.string(),
  severity:          AuditSeverityEnum.default('low'),
  resourceType:      z.string().nullable(),
  resourceId:        z.string().nullable(),
  metadata:          z.record(z.string(), z.unknown()).nullable(),
  ipAddress:         z.string().nullable(),
  userAgent:         z.string().nullable(),
  prevHash:          z.string().nullable().optional().default(null),
  rowHash:           z.string().nullable().optional().default(null),
  createdAt:         z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Result of a hash-chain verification pass.
export type ChainVerificationResult = {
  ok: boolean;
  checked: number;
  // auditLogId of the first row whose stored rowHash does not match the
  // recomputed value (or whose prevHash is broken). Null when ok.
  brokenAt: string | null;
};

// Pluggable cold-storage exporter seam (archive-before-delete / write-once
// store). Implementations may push to S3, GCS, a log aggregator, etc. The
// audit module never hard-depends on any of them — purgeExpired() accepts an
// optional exporter and falls back to returning the serialized batch.
export interface AuditArchiveExporter {
  export(tenantId: string, ndjson: string, rowCount: number): Promise<void>;
}
