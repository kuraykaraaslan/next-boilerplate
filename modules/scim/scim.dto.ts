import { z } from 'zod';
import { ScimNameSchema, ScimEmailSchema, SCIM_SCHEMAS } from './scim.types';

/**
 * SCIM 2.0 input DTOs (RFC 7643). We parse only the fields we map onto
 * `User` + `TenantMember`. Unknown fields are silently dropped — SCIM
 * clients commonly send IdP-specific extension attributes that have no
 * meaning here.
 */
// RFC 7643 core: phoneNumbers / addresses / locale.
const ScimPhoneSchema = z.object({ value: z.string(), type: z.string().optional(), primary: z.boolean().optional() });
const ScimAddressSchema = z.object({
  formatted: z.string().optional(), streetAddress: z.string().optional(), locality: z.string().optional(),
  region: z.string().optional(), postalCode: z.string().optional(), country: z.string().optional(),
  type: z.string().optional(), primary: z.boolean().optional(),
});
// Enterprise extension (urn:...:enterprise:2.0:User).
const ScimEnterpriseSchema = z.object({
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  organization: z.string().optional(),
  costCenter: z.string().optional(),
  division: z.string().optional(),
  manager: z.union([z.string(), z.object({ value: z.string().optional(), displayName: z.string().optional() })]).optional(),
}).passthrough();

export const ENTERPRISE_USER_URN = SCIM_SCHEMAS.ENTERPRISE_USER;

export const CreateScimUserDTO = z.object({
  schemas: z.array(z.string()).optional(),
  externalId: z.string().max(256).optional(),
  userName: z.string().min(1),
  name: ScimNameSchema.optional(),
  displayName: z.string().optional(),
  emails: z.array(ScimEmailSchema).optional(),
  phoneNumbers: z.array(ScimPhoneSchema).optional(),
  addresses: z.array(ScimAddressSchema).optional(),
  locale: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().optional(),
  // Enterprise extension carried under its URN key.
  [SCIM_SCHEMAS.ENTERPRISE_USER]: ScimEnterpriseSchema.optional(),
}).passthrough();
export type CreateScimUserInput = z.infer<typeof CreateScimUserDTO>;

export const UpdateScimUserDTO = CreateScimUserDTO.extend({
  id: z.string().optional(),
});
export type UpdateScimUserInput = z.infer<typeof UpdateScimUserDTO>;

export const ListScimUsersDTO = z.object({
  filter: z.string().optional(),
  startIndex: z.number().int().min(1).default(1),
  count: z.number().int().min(0).max(200).default(100),
});
export type ListScimUsersInput = z.infer<typeof ListScimUsersDTO>;

// ─── Group DTOs (RFC 7644 §3.5) ─────────────────────────────────────────────
const ScimGroupMemberInputSchema = z.object({ value: z.string(), display: z.string().optional(), type: z.string().optional() });
export const CreateScimGroupDTO = z.object({
  schemas: z.array(z.string()).optional(),
  externalId: z.string().max(256).optional(),
  displayName: z.string().min(1),
  members: z.array(ScimGroupMemberInputSchema).optional(),
}).passthrough();
export type CreateScimGroupInput = z.infer<typeof CreateScimGroupDTO>;

export { ScimPatchBodySchema as PatchScimUserDTO } from './scim.types';
export { SCIM_SCHEMAS };
