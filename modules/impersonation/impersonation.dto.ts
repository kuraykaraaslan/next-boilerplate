import { z } from "zod";
import { TenantMemberRoleEnum } from "../tenant_member/tenant_member.enums";

// Flow 1: System admin impersonates a user in a specific tenant
export const StartSystemImpersonationDTO = z.object({
  targetUserId: z.string().uuid(),
  tenantId: z.string().uuid(),
  targetTenantRole: TenantMemberRoleEnum.optional(),
});

// Flow 2: Tenant OWNER/ADMIN impersonates a tenant USER (tenantId comes from URL)
export const StartTenantImpersonationDTO = z.object({
  targetUserId: z.string().uuid(),
});

export type StartSystemImpersonationInput = z.infer<typeof StartSystemImpersonationDTO>;
export type StartTenantImpersonationInput = z.infer<typeof StartTenantImpersonationDTO>;
