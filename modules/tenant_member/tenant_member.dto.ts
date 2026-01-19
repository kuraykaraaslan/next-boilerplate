import { z } from 'zod';
import { TenantMemberRoleEnum, TenantMemberStatusEnum } from './tenant_member.enums';

export const CreateTenantMemberDTO = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  memberRole: TenantMemberRoleEnum.default('USER'),
  memberStatus: TenantMemberStatusEnum.default('ACTIVE')
});

export const UpdateTenantMemberDTO = z.object({
  memberRole: TenantMemberRoleEnum.optional(),
  memberStatus: TenantMemberStatusEnum.optional()
});

export const GetTenantMemberDTO = z.object({
  tenantMemberId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional()
}).refine((data) => {
  return data.tenantMemberId || (data.tenantId && data.userId);
}, {
  message: "Either tenantMemberId or both tenantId and userId must be provided"
});

export const GetTenantMembersDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().default(1),
  pageSize: z.number().default(10),
  search: z.string().optional(),
  memberRole: TenantMemberRoleEnum.optional(),
  memberStatus: TenantMemberStatusEnum.optional()
});

export type CreateTenantMemberInput = z.infer<typeof CreateTenantMemberDTO>;
export type UpdateTenantMemberInput = z.infer<typeof UpdateTenantMemberDTO>;
export type GetTenantMemberInput = z.infer<typeof GetTenantMemberDTO>;
export type GetTenantMembersInput = z.infer<typeof GetTenantMembersDTO>;
