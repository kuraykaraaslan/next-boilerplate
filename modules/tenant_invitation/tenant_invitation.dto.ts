import { z } from 'zod';
import { TenantMemberRoleEnum } from '../tenant_member/tenant_member.enums';
import { TenantInvitationStatusEnum } from './tenant_invitation.enums';

export const SendInvitationDTO = z.object({
  email: z.string().email(),
  memberRole: TenantMemberRoleEnum.default('USER'),
});

export const AcceptInvitationDTO = z.object({
  token: z.string().min(1),
});

export const DeclineInvitationDTO = z.object({
  token: z.string().min(1),
});

export const GetInvitationsDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().default(1),
  pageSize: z.number().default(10),
  status: TenantInvitationStatusEnum.nullable().optional(),
});

export type SendInvitationInput = z.infer<typeof SendInvitationDTO>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationDTO>;
export type DeclineInvitationInput = z.infer<typeof DeclineInvitationDTO>;
export type GetInvitationsInput = z.infer<typeof GetInvitationsDTO>;
