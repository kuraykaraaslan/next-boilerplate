import { z } from "zod";
import { SessionStatusEnum } from "./user_session.enums";
import { TenantMemberRoleEnum } from "../tenant_member/tenant_member.enums";

export const SessionMetaSchema = z.object({
  impersonation: z.object({
    impersonatorUserId: z.string().uuid(),
    impersonatorSessionId: z.string().uuid(),
    tenantId: z.string().uuid().optional(),
    targetTenantRole: TenantMemberRoleEnum.optional(),
  }).optional(),
}).passthrough();

export type SessionMeta = z.infer<typeof SessionMetaSchema>;

// Helper to coerce dates from JSON (handles both Date and string)
const dateOrString = z.union([z.date(), z.string().datetime()]).transform(val => 
  typeof val === 'string' ? new Date(val) : val
);

const dateOrStringNullable = z.union([z.date(), z.string().datetime()]).transform(val => 
  typeof val === 'string' ? new Date(val) : val
).nullable();

export const UserSessionSchema = z.object({
  userSessionId: z.string().uuid(),
  userId: z.string().uuid(),
  accessToken: z.string(),
  refreshToken: z.string(),
  deviceFingerprint: z.string().nullable(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  sessionStatus: SessionStatusEnum.default("ACTIVE"),
  otpVerifyNeeded: z.boolean().nullish().transform(val => val ?? false),
  sessionExpiry: dateOrString,
  createdAt: dateOrStringNullable,
  updatedAt: dateOrStringNullable,
  metadata: SessionMetaSchema.nullable().optional(),
});

export const SafeUserSessionSchema = UserSessionSchema.omit({
  accessToken: true,
  refreshToken: true,
  deviceFingerprint: true,
});

export type UserSession = z.infer<typeof UserSessionSchema>;
export type SafeUserSession = z.infer<typeof SafeUserSessionSchema>;
