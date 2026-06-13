import { z } from 'zod';
import { AuditActorTypeEnum, AuditSeverityEnum } from './audit_log.enums';

export const CreateAuditLogDTO = z.object({
  // tenantId is optional/nullable on the input — service defaults to
  // ROOT_TENANT_ID for platform-level events. Every persisted row, however,
  // has a real tenantId (the column is NOT NULL).
  tenantId:           z.string().uuid().nullable().optional(),
  actorId:            z.string().uuid().nullable().optional(),
  actorType:          AuditActorTypeEnum.default('SYSTEM'),
  // Dual-actor (impersonation): the impersonated user, when the true actor
  // (actorId) is acting on their behalf. Optional + additive.
  onBehalfOfActorId:  z.string().uuid().nullable().optional(),
  action:             z.string().min(1),
  // Optional override; when omitted the service derives severity from the
  // action via severityForAction().
  severity:           AuditSeverityEnum.optional(),
  resourceType:       z.string().nullable().optional(),
  resourceId:         z.string().nullable().optional(),
  metadata:           z.record(z.string(), z.any()).optional(),
  ipAddress:          z.string().nullable().optional(),
  userAgent:          z.string().nullable().optional(),
});

// Reusable coercion: ISO date string (or Date) → Date. Accepts a string OR a
// Date on input (so route handlers can forward raw query params) and always
// outputs a Date.
const DateLike = z.union([z.string(), z.date()]).pipe(z.coerce.date());

export const GetAuditLogsDTO = z.object({
  tenantId:     z.string().uuid().nullable().optional(),
  actorId:      z.string().uuid().nullable().optional(),
  action:       z.string().nullable().optional(),
  severity:     AuditSeverityEnum.nullable().optional(),
  resourceType: z.string().nullable().optional(),
  resourceId:   z.string().nullable().optional(),
  // Inclusive date-range filter on createdAt.
  fromDate:     DateLike.nullable().optional(),
  toDate:       DateLike.nullable().optional(),
  page:         z.number().int().min(1).default(1),
  pageSize:     z.number().int().min(1).max(100).default(20),
});

export const PurgeAuditLogsDTO = z.object({
  tenantId: z.string().uuid(),
  // When true, rows are serialized to NDJSON (returned to the caller / exporter)
  // before being hard-deleted.
  archive:  z.boolean().default(false),
});

export const ExportAuditLogsDTO = z.object({
  tenantId: z.string().uuid(),
  actorId:  z.string().uuid().nullable().optional(),
  fromDate: DateLike.nullable().optional(),
  toDate:   DateLike.nullable().optional(),
  format:   z.enum(['csv', 'ndjson']).default('ndjson'),
});

export const AnonymizeActorDTO = z.object({
  tenantId: z.string().uuid(),
  actorId:  z.string().uuid(),
});

// Cross-tenant aggregated query (root tenant only).
export const CrossTenantAuditQueryDTO = z.object({
  // Optional single-tenant filter — when set, the root-tenant viewer scopes the
  // aggregated view down to just this tenant's logs.
  tenantId: z.string().uuid().nullable().optional(),
  action:   z.string().nullable().optional(),
  severity: AuditSeverityEnum.nullable().optional(),
  fromDate: DateLike.nullable().optional(),
  toDate:   DateLike.nullable().optional(),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  // Retained for backward-compat callers that page via a hard cap instead of
  // page/pageSize; ignored when page-based params are used.
  limit:    z.number().int().min(1).max(1000).default(200),
});

// Input types use z.input so callers may pass the pre-parse shape (e.g. raw
// ISO date strings for the DateLike fields, optional fields omitted).
export type CreateAuditLogInput      = z.input<typeof CreateAuditLogDTO>;
export type GetAuditLogsInput        = z.input<typeof GetAuditLogsDTO>;
export type PurgeAuditLogsInput      = z.input<typeof PurgeAuditLogsDTO>;
export type ExportAuditLogsInput     = z.input<typeof ExportAuditLogsDTO>;
export type AnonymizeActorInput      = z.input<typeof AnonymizeActorDTO>;
export type CrossTenantAuditQueryInput = z.input<typeof CrossTenantAuditQueryDTO>;
