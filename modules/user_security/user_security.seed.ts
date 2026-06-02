import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { UserSecurity } from './entities/user_security.entity';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';

/**
 * user_security seed.
 *
 * Follows the store reference template:
 *  - Everything goes through `ctx.foc(repo, where, create)` keyed by the natural
 *    key. `UserSecurity.userId` carries `{ unique: true }`, so it is the natural
 *    key — re-runs reuse the existing security row per user.
 *  - `UserSecurity` has NO `tenantId` column, so it is *system-scoped*: we use
 *    `ctx.systemRepo<UserSecurity>(UserSecurity)` and never set tenantId.
 *  - `otpMethods` only accepts the enum values EMAIL / SMS / TOTP_APP — we vary
 *    across all three. jsonb fields (`passkeys`, `passwordHistory`,
 *    `otpBackupCodes`) use real object/string shapes per `user_security.types`.
 *  - Timestamps are real Date objects (now / a few days back) — never strings.
 *  - `userId` values are bare cross-module uuids; we prefer the shared
 *    `SEED_USER_ID` / `SEED_ADMIN_USER_ID` constants, falling back to a fixed
 *    third uuid for the locked-out demo account.
 */
export async function seedUserSecurity(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;
  const repo = ctx.systemRepo<UserSecurity>(UserSecurity);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  // Third demo account: locked out + must-change, no shared constant for it.
  const lockedUserId = 'a0000000-0000-4000-8000-000000000003';

  // A realistic StoredPasskey jsonb shape (see user_security.types StoredPasskeySchema).
  type StoredPasskey = {
    credentialId: string;
    publicKey: string;
    counter: number;
    aaguid: string;
    label: string;
    createdAt: string;
    lastUsedAt: string | null;
    transports: string[];
  };

  // Concrete local def type so foc's DeepPartial<UserSecurity> inference stays intact.
  type SecuritySpec = {
    userId: string;
    otpMethods: string[];
    otpSecret?: string;
    otpBackupCodes: string[];
    lastLoginAt?: Date;
    lastLoginIp?: string;
    lastLoginDevice?: string;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    passkeyEnabled: boolean;
    passkeys: StoredPasskey[];
    passwordHistory: string[];
    passwordChangedAt?: Date;
    mustChangePassword: boolean;
  };

  const specs: SecuritySpec[] = [
    // 1) Standard user: TOTP app + email OTP, has backup codes, recently logged in.
    {
      userId,
      otpMethods: ['TOTP_APP', 'EMAIL'],
      otpSecret: 'JBSWY3DPEHPK3PXP',
      otpBackupCodes: ['11112222', '33334444', '55556666', '77778888'],
      lastLoginAt: new Date(now - 2 * 60 * 60 * 1000),
      lastLoginIp: '203.0.113.10',
      lastLoginDevice: 'Chrome 124 on macOS',
      failedLoginAttempts: 0,
      passkeyEnabled: true,
      passkeys: [
        {
          credentialId: 'AaBbCcDd-test-credential-001',
          publicKey: 'pQECAyYgASFYIHRlc3QtcHVibGljLWtleS14',
          counter: 7,
          aaguid: 'adce0002-35bc-c60a-648b-0b25f1f05503',
          label: 'MacBook Touch ID',
          createdAt: new Date(now - 30 * day).toISOString(),
          lastUsedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          transports: ['internal', 'hybrid'],
        },
      ],
      passwordHistory: [
        '$2b$10$seedhash000000000000000000000000000000000000000000aa',
        '$2b$10$seedhash000000000000000000000000000000000000000000bb',
      ],
      passwordChangedAt: new Date(now - 45 * day),
      mustChangePassword: false,
    },
    // 2) Admin: SMS OTP only, no passkeys, freshly rotated password.
    {
      userId: adminUserId,
      otpMethods: ['SMS'],
      otpSecret: undefined,
      otpBackupCodes: ['90901010', '20203030'],
      lastLoginAt: new Date(now - 1 * day),
      lastLoginIp: '198.51.100.42',
      lastLoginDevice: 'Firefox 126 on Windows 11',
      failedLoginAttempts: 1,
      passkeyEnabled: false,
      passkeys: [],
      passwordHistory: [
        '$2b$10$seedhash000000000000000000000000000000000000000000cc',
      ],
      passwordChangedAt: new Date(now - 3 * day),
      mustChangePassword: false,
    },
    // 3) Locked-out demo account: no OTP enrolled, too many failed attempts,
    //    currently locked and forced to change password on next login.
    {
      userId: lockedUserId,
      otpMethods: [],
      otpSecret: undefined,
      otpBackupCodes: [],
      lastLoginAt: new Date(now - 10 * day),
      lastLoginIp: '192.0.2.77',
      lastLoginDevice: 'Safari 17 on iPhone',
      failedLoginAttempts: 5,
      lockedUntil: new Date(now + 30 * 60 * 1000),
      passkeyEnabled: false,
      passkeys: [],
      passwordHistory: [],
      passwordChangedAt: new Date(now - 120 * day),
      mustChangePassword: true,
    },
  ];

  for (const spec of specs) {
    await foc(
      repo,
      { userId: spec.userId } as FindOptionsWhere<UserSecurity>,
      {
        userId: spec.userId,
        otpMethods: spec.otpMethods,
        otpSecret: spec.otpSecret,
        otpBackupCodes: spec.otpBackupCodes,
        lastLoginAt: spec.lastLoginAt,
        lastLoginIp: spec.lastLoginIp,
        lastLoginDevice: spec.lastLoginDevice,
        failedLoginAttempts: spec.failedLoginAttempts,
        lockedUntil: spec.lockedUntil,
        passkeyEnabled: spec.passkeyEnabled,
        passkeys: spec.passkeys,
        passwordHistory: spec.passwordHistory,
        passwordChangedAt: spec.passwordChangedAt,
        mustChangePassword: spec.mustChangePassword,
      },
    );
  }

  // Publish references later modules might consume.
  refs.lockedUserId = lockedUserId;

  ctx.log(`user_security: 3 security profiles (totp+passkey / sms / locked) seeded`);
}
