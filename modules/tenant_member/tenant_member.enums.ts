import { z } from 'zod';

export const TenantMemberRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'USER'
]);

export const TenantMemberStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING'
]);

export type TenantMemberRole = z.infer<typeof TenantMemberRoleEnum>;
export type TenantMemberStatus = z.infer<typeof TenantMemberStatusEnum>;
