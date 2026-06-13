import { z } from 'zod';
import { OTPMethodEnum } from './user_security.enums';

export const StoredPasskeySchema = z.object({
  credentialId: z.string(),
  publicKey: z.string(),       // base64url encoded COSE key
  counter: z.number(),
  aaguid: z.string(),
  label: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  transports: z.array(z.string()),
});

export type StoredPasskey = z.infer<typeof StoredPasskeySchema>;

export const TrustedDeviceSchema = z.object({
  idHash: z.string(),          // SHA-256 of the device token — never the raw token
  label: z.string().nullable(),
  createdAt: z.string(),
  lastSeenAt: z.string().nullable(),
  expiresAt: z.string(),
});
export type TrustedDevice = z.infer<typeof TrustedDeviceSchema>;

export const UserSecuritySchema = z.object({
  otpMethods: z.array(OTPMethodEnum).nullish().transform(val => val ?? []),
  otpSecret: z.string().nullable(),
  otpBackupCodes: z.array(z.string()).nullish().transform(val => val ?? []),
  lastLoginAt: z.date().nullable(),
  lastLoginIp: z.string().nullable(),
  lastLoginDevice: z.string().nullable(),
  failedLoginAttempts: z.number().nullish().transform(val => val ?? 0),
  lockedUntil: z.date().nullable(),
  passkeyEnabled: z.boolean().nullish().transform(val => val ?? false),
  passkeys: z.array(StoredPasskeySchema).nullish().transform(val => val ?? []),
  trustedDevices: z.array(TrustedDeviceSchema).nullish().transform(val => val ?? []),
  // ── KD-7: rotation history (bcrypt hashes, most recent first) ─────────
  passwordHistory: z.array(z.string()).nullish().transform(val => val ?? []),
  passwordChangedAt: z.date().nullable().optional(),
  // ── KD-4: force-change on first/next login ────────────────────────────
  mustChangePassword: z.boolean().nullish().transform(val => val ?? false),
});

export const SafeUserSecuritySchema = UserSecuritySchema.omit({
  otpSecret: true,
  otpBackupCodes: true,
  passwordHistory: true,
});

export const SafeUserSecurityDefault: z.infer<typeof SafeUserSecuritySchema> = {
  otpMethods: [],
  lastLoginAt: null,
  lastLoginIp: null,
  lastLoginDevice: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  passkeyEnabled: false,
  passkeys: [],
  trustedDevices: [],
  passwordChangedAt: null,
  mustChangePassword: false,
};

export type UserSecurity = z.infer<typeof UserSecuritySchema>;
export type SafeUserSecurity = z.infer<typeof SafeUserSecuritySchema>;
