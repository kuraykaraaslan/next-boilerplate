import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@nb/seed/server/seed.context';
import { UserSession } from './entities/user_session.entity';

/**
 * Seed for the `user_session` module.
 *
 * Rules of the house (mirrors store.seed.ts):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows. `UserSession` has no @Unique constraint, but
 *    `accessToken` is an indexed token that is unique per session in practice —
 *    we use it as the natural key.
 *  - Use *valid* enum values: `sessionStatus` is one of ACTIVE / EXPIRED /
 *    REVOKED (see user_session.enums.ts). Never invent another status.
 *  - `UserSession` has NO `tenantId` column → it is system-scoped: use
 *    `ctx.systemRepo<UserSession>(UserSession)` and do NOT set tenantId.
 *  - Timestamps are real Date objects (this runs under tsx / Node).
 */
export async function seedUserSession(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;
  const repo = ctx.systemRepo<UserSession>(UserSession);

  // Cross-module user ids: prefer published refs, fall back to the shared
  // deterministic seed constants (the session DB has no FK to the user table).
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  // Concrete local def type so foc's DeepPartial inference stays intact
  // (do NOT spread a Partial<UserSession> into the create arg).
  type SessionDef = {
    userId: string;
    accessToken: string;
    refreshToken: string;
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    sessionStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    otpVerifyNeeded: boolean;
    sessionExpiry: Date;
    metadata?: unknown;
    createdAt: Date;
  };

  const defs: SessionDef[] = [
    // Active web session for the regular user — valid for another day.
    {
      userId,
      accessToken: 'seed-access-token-user-web-active',
      refreshToken: 'seed-refresh-token-user-web-active',
      deviceFingerprint: 'fp-chrome-macos-001',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      ipAddress: '203.0.113.10',
      sessionStatus: 'ACTIVE',
      otpVerifyNeeded: false,
      sessionExpiry: new Date(now.getTime() + oneDay),
      metadata: { client: 'web', platform: 'macos' },
      createdAt: new Date(now.getTime() - 2 * oneHour),
    },
    // Active mobile session for the regular user that still needs OTP verification.
    {
      userId,
      accessToken: 'seed-access-token-user-mobile-otp',
      refreshToken: 'seed-refresh-token-user-mobile-otp',
      deviceFingerprint: 'fp-ios-iphone-002',
      userAgent: 'BoilerplateApp/2.3 (iPhone; iOS 17.4; Scale/3.00)',
      ipAddress: '198.51.100.42',
      sessionStatus: 'ACTIVE',
      otpVerifyNeeded: true,
      sessionExpiry: new Date(now.getTime() + 7 * oneDay),
      metadata: { client: 'mobile', platform: 'ios', appVersion: '2.3' },
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    // Expired session for the admin user (history / cleanup target).
    {
      userId: adminUserId,
      accessToken: 'seed-access-token-admin-expired',
      refreshToken: 'seed-refresh-token-admin-expired',
      deviceFingerprint: 'fp-firefox-linux-003',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
      ipAddress: '192.0.2.77',
      sessionStatus: 'EXPIRED',
      otpVerifyNeeded: false,
      sessionExpiry: new Date(now.getTime() - 3 * oneDay),
      metadata: { client: 'web', platform: 'linux' },
      createdAt: new Date(now.getTime() - 10 * oneDay),
    },
    // Revoked session for the admin user (e.g. signed out from another device).
    {
      userId: adminUserId,
      accessToken: 'seed-access-token-admin-revoked',
      refreshToken: 'seed-refresh-token-admin-revoked',
      deviceFingerprint: 'fp-edge-windows-004',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0',
      ipAddress: '203.0.113.200',
      sessionStatus: 'REVOKED',
      otpVerifyNeeded: false,
      sessionExpiry: new Date(now.getTime() + 2 * oneDay),
      metadata: { client: 'web', platform: 'windows', revokedReason: 'manual_signout' },
      createdAt: new Date(now.getTime() - oneDay),
    },
  ];

  let firstSessionId: string | undefined;
  for (const def of defs) {
    const session = await foc(
      repo,
      { accessToken: def.accessToken } as FindOptionsWhere<UserSession>,
      def,
    );
    firstSessionId ??= session.userSessionId;
  }

  // Publish a reference later modules (e.g. impersonation, audit) might consume.
  refs.userSessionId = firstSessionId;

  ctx.log(`user_session: 4 sessions (active/expired/revoked) for users ${userId}, ${adminUserId}`);
}
