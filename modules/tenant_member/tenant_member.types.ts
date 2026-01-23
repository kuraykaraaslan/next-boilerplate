import { z } from 'zod';
import { TenantMemberRoleEnum, TenantMemberStatusEnum } from './tenant_member.enums';
import { SafeUserSchema } from '../user/user.types';

export const TenantMemberSchema = z.object({
  tenantMemberId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  memberRole: TenantMemberRoleEnum.default('USER'),
  memberStatus: TenantMemberStatusEnum.default('ACTIVE'),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  deletedAt: z.date().nullable()
});

export const SafeTenantMemberSchema = TenantMemberSchema.omit({
  deletedAt: true
}).extend({
  user: z.object(SafeUserSchema.shape).nullable()
});

export type TenantMember = z.infer<typeof TenantMemberSchema>;
export type SafeTenantMember = z.infer<typeof SafeTenantMemberSchema>;
