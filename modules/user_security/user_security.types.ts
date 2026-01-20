import { z } from 'zod';
import { OTPMethodEnum } from './user_security.enums';

export const UserSecuritySchema = z.object({
  otpMethods: z.array(OTPMethodEnum).default([]),
  otpSecret: z.string().optional(),
  otpBackupCodes: z.array(z.string()).default([]),
  lastLoginAt: z.date().optional(),
  lastLoginIp: z.string().optional(),
  lastLoginDevice: z.string().optional(),
  failedLoginAttempts: z.number().default(0),
  lockedUntil: z.date().optional()
});

export const SafeUserSecuritySchema = UserSecuritySchema.omit({
  otpSecret: true,
  otpBackupCodes: true
});

export const SafeUserSecurityDefault: z.infer<typeof SafeUserSecuritySchema> = {
  otpMethods: [],
  lastLoginAt: undefined,
  lastLoginIp: undefined,
  lastLoginDevice: undefined,
  failedLoginAttempts: 0,
  lockedUntil: undefined
};

export type UserSecurity = z.infer<typeof UserSecuritySchema>;
export type SafeUserSecurity = z.infer<typeof SafeUserSecuritySchema>;
