import { z } from 'zod';
import { TenantMemberRoleEnum, TenantMemberStatusEnum } from './tenant_member.enums';

export const CreateTenantMemberDTO = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  memberRole: TenantMemberRoleEnum.default('USER'),
  memberStatus: TenantMemberStatusEnum.default('ACTIVE')
});

export const UpdateTenantMemberDTO = z.object({
  memberRole: TenantMemberRoleEnum.nullable(),
  memberStatus: TenantMemberStatusEnum.nullable()
});

export const GetTenantMemberDTO = z.object({
  tenantMemberId: z.string().uuid().nullable(),
  tenantId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable()
}).refine((data) => {
  return data.tenantMemberId || (data.tenantId && data.userId);
}, {
  message: "Either tenantMemberId or both tenantId and userId must be provided"
});

export const GetTenantMembersDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().default(1),
  pageSize: z.number().default(10),
  search: z.string().nullable(),
  memberRole: TenantMemberRoleEnum.nullable(),
  memberStatus: TenantMemberStatusEnum.nullable()
});

export type CreateTenantMemberInput = z.infer<typeof CreateTenantMemberDTO>;
export type UpdateTenantMemberInput = z.infer<typeof UpdateTenantMemberDTO>;
export type GetTenantMemberInput = z.infer<typeof GetTenantMemberDTO>;
export type GetTenantMembersInput = z.infer<typeof GetTenantMembersDTO>;
