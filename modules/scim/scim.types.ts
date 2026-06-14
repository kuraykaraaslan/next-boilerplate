import { z } from 'zod';

/**
 * SCIM 2.0 schema URNs — RFC 7643 §3 / RFC 7644 §3.
 * These must appear verbatim in every resource representation.
 */
export const SCIM_SCHEMAS = {
  USER: 'urn:ietf:params:scim:schemas:core:2.0:User',
  GROUP: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  ENTERPRISE_USER: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  LIST_RESPONSE: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  PATCH_OP: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  ERROR: 'urn:ietf:params:scim:api:messages:2.0:Error',
  SERVICE_PROVIDER_CONFIG: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig',
  RESOURCE_TYPE: 'urn:ietf:params:scim:schemas:core:2.0:ResourceType',
  SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Schema',
} as const;

export const SCIM_CONTENT_TYPE = 'application/scim+json; charset=utf-8';

// ─── Resource-shared meta ────────────────────────────────────────────────
export const ScimMetaSchema = z.object({
  resourceType: z.string(),
  created: z.string().optional(),
  lastModified: z.string().optional(),
  location: z.string().optional(),
  version: z.string().optional(),
});
export type ScimMeta = z.infer<typeof ScimMetaSchema>;

// ─── User ────────────────────────────────────────────────────────────────
export const ScimNameSchema = z.object({
  formatted: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  middleName: z.string().optional(),
  honorificPrefix: z.string().optional(),
  honorificSuffix: z.string().optional(),
}).partial();
export type ScimName = z.infer<typeof ScimNameSchema>;

export const ScimEmailSchema = z.object({
  value: z.string(),
  type: z.string().optional(),
  primary: z.boolean().optional(),
  display: z.string().optional(),
});
export type ScimEmail = z.infer<typeof ScimEmailSchema>;

export const ScimUserSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.USER]),
  id: z.string(),
  externalId: z.string().optional(),
  userName: z.string(),
  name: ScimNameSchema.optional(),
  displayName: z.string().optional(),
  emails: z.array(ScimEmailSchema).optional(),
  phoneNumbers: z.array(z.object({ value: z.string(), type: z.string().optional(), primary: z.boolean().optional() })).optional(),
  active: z.boolean().default(true),
  meta: ScimMetaSchema,
});
export type ScimUser = z.infer<typeof ScimUserSchema>;

// ─── Group ───────────────────────────────────────────────────────────────
export const ScimGroupMemberSchema = z.object({
  value: z.string(),
  $ref: z.string().optional(),
  display: z.string().optional(),
  type: z.string().optional(),
});
export type ScimGroupMember = z.infer<typeof ScimGroupMemberSchema>;

export const ScimGroupSchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.GROUP]),
  id: z.string(),
  displayName: z.string(),
  members: z.array(ScimGroupMemberSchema).optional(),
  meta: ScimMetaSchema,
});
export type ScimGroup = z.infer<typeof ScimGroupSchema>;

// ─── List response ───────────────────────────────────────────────────────
export type ScimListResponse<T> = {
  schemas: [typeof SCIM_SCHEMAS.LIST_RESPONSE];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
};

// ─── Error ───────────────────────────────────────────────────────────────
export const SCIM_ERROR_TYPES = [
  'uniqueness',
  'invalidFilter',
  'invalidPath',
  'invalidSyntax',
  'invalidValue',
  'invalidVers',
  'mutability',
  'noTarget',
  'sensitive',
  'tooMany',
] as const;
export type ScimErrorType = typeof SCIM_ERROR_TYPES[number];

export type ScimErrorBody = {
  schemas: [typeof SCIM_SCHEMAS.ERROR];
  status: string;
  detail: string;
  scimType?: ScimErrorType;
};

// ─── PatchOp (RFC 7644 §3.5.2) ───────────────────────────────────────────
export const ScimPatchOperationSchema = z.object({
  op: z.enum(['add', 'replace', 'remove', 'Add', 'Replace', 'Remove']).transform((v) => v.toLowerCase() as 'add' | 'replace' | 'remove'),
  path: z.string().optional(),
  value: z.any().optional(),
});
export type ScimPatchOperation = z.infer<typeof ScimPatchOperationSchema>;

export const ScimPatchBodySchema = z.object({
  schemas: z.array(z.string()).default([SCIM_SCHEMAS.PATCH_OP]),
  Operations: z.array(ScimPatchOperationSchema).min(1),
});
export type ScimPatchBody = z.infer<typeof ScimPatchBodySchema>;

// ─── Pagination defaults ─────────────────────────────────────────────────
export const SCIM_PAGINATION = {
  DEFAULT_START_INDEX: 1,
  DEFAULT_COUNT: 100,
  MAX_COUNT: 200,
} as const;
