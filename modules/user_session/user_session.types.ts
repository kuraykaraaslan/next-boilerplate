import { z } from "zod";
import { SessionStatusEnum } from "./user_session.enums";

export const UserSessionSchema = z.object({
  userSessionId: z.string().uuid(),
  userId: z.string().uuid(),
  accessToken: z.string(),
  refreshToken: z.string(),
  deviceFingerprint: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  sessionStatus: SessionStatusEnum.default("ACTIVE"),
  otpVerifyNeeded: z.boolean().default(false),
  sessionExpiry: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const SafeUserSessionSchema = UserSessionSchema.omit({
  accessToken: true,
  refreshToken: true,
  deviceFingerprint: true,
});

export type UserSession = z.infer<typeof UserSessionSchema>;
export type SafeUserSession = z.infer<typeof SafeUserSessionSchema>;
