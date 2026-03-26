import { z } from 'zod';
import { TenantInvitationStatusEnum } from './tenant_invitation.enums';
import { TenantMemberRoleEnum } from '../tenant_member/tenant_member.enums';

export const TenantInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  invitedByUserId: z.string().uuid(),
  memberRole: TenantMemberRoleEnum.default('USER'),
  token: z.string(),
  status: TenantInvitationStatusEnum.default('PENDING'),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SafeTenantInvitationSchema = TenantInvitationSchema.omit({
  token: true,
});

export type TenantInvitation = z.infer<typeof TenantInvitationSchema>;
export type SafeTenantInvitation = z.infer<typeof SafeTenantInvitationSchema>;
