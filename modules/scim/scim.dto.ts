import { z } from 'zod';
import { ScimNameSchema, ScimEmailSchema, SCIM_SCHEMAS } from './scim.types';

/**
 * SCIM 2.0 input DTOs (RFC 7643). We parse only the fields we map onto
 * `User` + `TenantMember`. Unknown fields are silently dropped — SCIM
 * clients commonly send IdP-specific extension attributes that have no
 * meaning here.
 */
export const CreateScimUserDTO = z.object({
  schemas: z.array(z.string()).optional(),
  externalId: z.string().max(256).optional(),
  userName: z.string().min(1),
  name: ScimNameSchema.optional(),
  displayName: z.string().optional(),
  emails: z.array(ScimEmailSchema).optional(),
  active: z.boolean().optional(),
  password: z.string().optional(),
});
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

export { ScimPatchBodySchema as PatchScimUserDTO } from './scim.types';
export { SCIM_SCHEMAS };
