import { z } from 'zod';
import { AuditActorTypeEnum } from './audit_log.enums';

export const CreateAuditLogDTO = z.object({
  tenantId:     z.string().uuid().nullable().optional(),
  actorId:      z.string().uuid().nullable().optional(),
  actorType:    AuditActorTypeEnum.default('SYSTEM'),
  action:       z.string().min(1),
  resourceType: z.string().nullable().optional(),
  resourceId:   z.string().nullable().optional(),
  metadata:     z.record(z.string(), z.any()).optional(),
  ipAddress:    z.string().nullable().optional(),
  userAgent:    z.string().nullable().optional(),
});

export const GetAuditLogsDTO = z.object({
  tenantId:     z.string().uuid().nullable().optional(),
  actorId:      z.string().uuid().nullable().optional(),
  action:       z.string().nullable().optional(),
  resourceType: z.string().nullable().optional(),
  resourceId:   z.string().nullable().optional(),
  page:         z.number().int().min(1).default(1),
  pageSize:     z.number().int().min(1).max(100).default(20),
});

export type CreateAuditLogInput = z.infer<typeof CreateAuditLogDTO>;
export type GetAuditLogsInput   = z.infer<typeof GetAuditLogsDTO>;
