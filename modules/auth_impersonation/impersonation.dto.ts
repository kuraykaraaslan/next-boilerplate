import { z } from "zod";
import { TenantMemberRoleEnum } from "../tenant_member/tenant_member.enums";

// Step-up re-authentication credential supplied on impersonation start
// (GOODTOHAVE #3). Exactly one of password / totp is provided; the start flow
// only enforces it when the target tenant has `impersonationRequireStepUp`.
export const StepUpCredentialDTO = z
  .object({
    password: z.string().min(1).optional(),
    totp: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.password) || Boolean(v.totp), {
    message: "STEP_UP_REQUIRED",
  });
export type StepUpCredentialInput = z.infer<typeof StepUpCredentialDTO>;

// Required business justification for every impersonation start (GOODTOHAVE #6).
// Stored in the audit log metadata to satisfy SOC 2 / ISO 27001 / GDPR
// purpose-limitation requirements.
const ReasonSchema = z
  .string()
  .trim()
  .min(3, { message: "REASON_REQUIRED" })
  .max(500);

// Flow 1: System admin impersonates a user in a specific tenant
export const StartSystemImpersonationDTO = z.object({
  targetUserId: z.string().uuid(),
  tenantId: z.string().uuid(),
  targetTenantRole: TenantMemberRoleEnum.optional(),
  reason: ReasonSchema,
  stepUp: StepUpCredentialDTO.optional(),
});

// Flow 2: Tenant OWNER/ADMIN impersonates a tenant USER (tenantId comes from URL)
export const StartTenantImpersonationDTO = z.object({
  targetUserId: z.string().uuid(),
  reason: ReasonSchema,
  stepUp: StepUpCredentialDTO.optional(),
});

export type StartSystemImpersonationInput = z.infer<typeof StartSystemImpersonationDTO>;
export type StartTenantImpersonationInput = z.infer<typeof StartTenantImpersonationDTO>;
