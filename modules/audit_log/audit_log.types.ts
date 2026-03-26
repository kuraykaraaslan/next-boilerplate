import { z } from 'zod';
import { AuditActorTypeEnum } from './audit_log.enums';

export const AuditLogSchema = z.object({
  auditLogId:   z.string().uuid(),
  tenantId:     z.string().uuid().nullable(),
  actorId:      z.string().uuid().nullable(),
  actorType:    AuditActorTypeEnum,
  action:       z.string(),
  resourceType: z.string().nullable(),
  resourceId:   z.string().nullable(),
  metadata:     z.record(z.string(), z.unknown()).nullable(),
  ipAddress:    z.string().nullable(),
  userAgent:    z.string().nullable(),
  createdAt:    z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
