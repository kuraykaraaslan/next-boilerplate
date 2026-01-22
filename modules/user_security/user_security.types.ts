import { z } from 'zod';
import { OTPMethodEnum } from './user_security.enums';

export const UserSecuritySchema = z.object({
  otpMethods: z.array(OTPMethodEnum).nullish().transform(val => val ?? []),
  otpSecret: z.string().nullable(),
  otpBackupCodes: z.array(z.string()).nullish().transform(val => val ?? []),
  lastLoginAt: z.date().nullable(),
  lastLoginIp: z.string().nullable(),
  lastLoginDevice: z.string().nullable(),
  failedLoginAttempts: z.number().nullish().transform(val => val ?? 0),
  lockedUntil: z.date().nullable()
});

export const SafeUserSecuritySchema = UserSecuritySchema.omit({
  otpSecret: true,
  otpBackupCodes: true
});

export const SafeUserSecurityDefault: z.infer<typeof SafeUserSecuritySchema> = {
  otpMethods: [],
  lastLoginAt: null,
  lastLoginIp: null,
  lastLoginDevice: null,
  failedLoginAttempts: 0,
  lockedUntil: null
};

export type UserSecurity = z.infer<typeof UserSecuritySchema>;
export type SafeUserSecurity = z.infer<typeof SafeUserSecuritySchema>;
