import { z } from 'zod';
import { TenantMemberRoleEnum, TenantMemberStatusEnum } from './tenant_member.enums';
import { SafeUserSchema } from '@nb/user/server/user.types';
import { SafeTenantSchema } from '@nb/tenant/server/tenant.types';

export const TenantMemberSchema = z.object({
  tenantMemberId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  memberRole: TenantMemberRoleEnum.default('USER'),
  memberStatus: TenantMemberStatusEnum.default('ACTIVE'),
  externalId: z.string().max(256).nullable().optional(),
  sessionVersion: z.number().int().default(0),
  suspensionReason: z.string().nullable().optional(),
  suspendedUntil: z.date().nullable().optional(),
  lastActiveAt: z.date().nullable().optional(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),

  tenant: SafeTenantSchema.extend({}).nullable().optional(),
  user: SafeUserSchema.extend({}).nullable().optional()
});

export const SafeTenantMemberSchema = TenantMemberSchema.omit({
  deletedAt: true
}).extend({
  user: z.lazy(() => SafeUserSchema).nullable().optional()
});

export type TenantMember = z.infer<typeof TenantMemberSchema>;
export type SafeTenantMember = z.infer<typeof SafeTenantMemberSchema>;
