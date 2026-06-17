import 'reflect-metadata';
import { env } from '@kuraykaraaslan/env';
import { Not } from 'typeorm';
import { getDataSource } from '@kuraykaraaslan/db';
import { UserSession as UserSessionEntity } from './entities/user_session.entity';
import redis from '@kuraykaraaslan/redis';
import { v4 as uuidv4 } from 'uuid';
import { SafeUserSession, SafeUserSessionSchema, type SessionMeta } from './user_session.types';
import { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import { SafeUserSecurity } from '@kuraykaraaslan/user_security/server/user_security.types';
import UserSessionMessages from './user_session.messages';
import UserSessionTokenService, { type TokenPayload } from './user_session.token.service';
import UserSessionCacheService from './user_session.cache.service';
import type { SessionStatus } from './user_session.enums';
import AuthPolicyService from '@kuraykaraaslan/auth/server/auth.policy.service';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import UserSessionAuthService from './user_session.auth.service';

export { UserSessionAuthService };

const IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000;
const SESSION_EXPIRY_MS = env.SESSION_EXPIRY_MS ?? (1000 * 60 * 60 * 24 * 7);

export default class UserSessionCrudService {

  static async createSession({ user, userSecurity, deviceFingerprint, userAgent, ipAddress, otpIgnore = false, tenantId }: {
    user: SafeUser;
    userSecurity: SafeUserSecurity;
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    otpIgnore?: boolean;
    tenantId?: string;
  }): Promise<{ userSession: SafeUserSession; rawAccessToken: string; rawRefreshToken: string }> {
    const userSessionId = uuidv4();
    const rawAccessToken = UserSessionTokenService.generateAccessToken({ userId: user.userId, userSessionId, deviceFingerprint });
    const rawRefreshToken = UserSessionTokenService.generateRefreshToken({ userId: user.userId, userSessionId, deviceFingerprint });
    const otpVerifyNeeded = !otpIgnore && (userSecurity?.otpMethods?.length ?? 0) > 0;

    const sessionPolicy = await AuthPolicyService.getSessionPolicy(tenantId);
    const absoluteCapMs = sessionPolicy.absoluteMaxHours * 60 * 60 * 1000;
    const expiryMs = Math.min(SESSION_EXPIRY_MS, absoluteCapMs);

    const ds = await getDataSource();

    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (accessPolicy.singleSessionOnly) {
      await ds.getRepository(UserSessionEntity).delete({ userId: user.userId });
      await UserSessionCacheService.clearUserSessionCache(user.userId);
    }

    const repo = ds.getRepository(UserSessionEntity);
    const sessionMeta: import('./user_session.types').SessionMeta = tenantId ? { tenantId } : {};
    const session = repo.create({
      userSessionId,
      userId: user.userId,
      accessToken: UserSessionTokenService.hashToken(rawAccessToken),
      refreshToken: UserSessionTokenService.hashToken(rawRefreshToken),
      deviceFingerprint,
      userAgent,
      ipAddress,
      otpVerifyNeeded,
      sessionExpiry: new Date(Date.now() + expiryMs),
      metadata: sessionMeta as unknown,
    });
    const saved = await repo.save(session);

    await redis
      .setex(`session:idle:${userSessionId}`, Math.max(60, sessionPolicy.idleTimeoutMinutes * 60), '1')
      .catch(() => {});

    // Concurrent-session cap: prune the oldest sessions beyond the configured
    // ceiling (keeps the newest N, including the one just created).
    await UserSessionCrudService.enforceConcurrentLimit(user.userId, tenantId).catch(() => {});

    return { userSession: SafeUserSessionSchema.parse(saved), rawAccessToken, rawRefreshToken };
  }

  /**
   * Enforce `maxConcurrentSessions` (per-tenant setting, 0/unset = unlimited):
   * keep the newest N sessions and delete the rest. Bounds credential-theft
   * blast radius and stops unbounded session accumulation.
   */
  static async enforceConcurrentLimit(userId: string, tenantId?: string): Promise<number> {
    const raw = await SettingService.getValue(tenantId ?? ROOT_TENANT_ID, 'maxConcurrentSessions').catch(() => null);
    const max = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(max) || max <= 0) return 0;

    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const sessions = await repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    if (sessions.length <= max) return 0;

    const stale = sessions.slice(max);
    await repo.remove(stale);
    await UserSessionCacheService.clearUserSessionCache(userId);
    return stale.length;
  }

  static async createImpersonationSession({ targetUser, impersonationMeta, userAgent, ipAddress, ttlMs }: {
    targetUser: SafeUser;
    impersonationMeta: NonNullable<SessionMeta['impersonation']>;
    userAgent?: string;
    ipAddress?: string;
    // Per-tenant impersonation TTL (ms). Resolved by the impersonation module
    // (`ImpersonationService.getImpersonationTtlMs`) and threaded in here to keep
    // a single source of truth without a user_session → auth_impersonation cycle.
    // Falls back to the 1-hour default when omitted.
    ttlMs?: number;
  }): Promise<{ userSession: SafeUserSession; rawAccessToken: string; rawRefreshToken: string }> {
    const userSessionId = uuidv4();
    const jwtPayload: TokenPayload = { userId: targetUser.userId, userSessionId, impersonation: impersonationMeta };
    const rawAccessToken = UserSessionTokenService.generateAccessToken(jwtPayload);
    const rawRefreshToken = UserSessionTokenService.generateRefreshToken(jwtPayload);
    const metadata: SessionMeta = { impersonation: impersonationMeta };

    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = repo.create({
      userSessionId,
      userId: targetUser.userId,
      accessToken: UserSessionTokenService.hashToken(rawAccessToken),
      refreshToken: UserSessionTokenService.hashToken(rawRefreshToken),
      userAgent,
      ipAddress,
      sessionExpiry: new Date(Date.now() + (ttlMs && ttlMs > 0 ? ttlMs : IMPERSONATION_SESSION_TTL_MS)),
      metadata: metadata as unknown,
    });
    const saved = await repo.save(session);
    return { userSession: SafeUserSessionSchema.parse(saved), rawAccessToken, rawRefreshToken };
  }

  static async updateSession(
    userSessionId: string,
    updates: Partial<Pick<{ otpVerifyNeeded: boolean; sessionStatus: SessionStatus }, 'otpVerifyNeeded' | 'sessionStatus'>>
  ): Promise<SafeUserSession> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = await repo.findOne({ where: { userSessionId } });
    if (!session) throw new AppError(UserSessionMessages.SESSION_NOT_FOUND, 401, ErrorCode.UNAUTHORIZED);

    await repo.update({ userSessionId }, updates as any);
    await UserSessionCacheService.clearUserSessionCache(session.userId);
    const updated = await repo.findOne({ where: { userSessionId } });
    return SafeUserSessionSchema.parse(updated!);
  }

  static async deleteSession(userSessionId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = await repo.findOne({ where: { userSessionId } });
    if (session) {
      await repo.delete({ userSessionId });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
    }
  }

  static async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSessionEntity).delete({ userId, userSessionId: Not(currentSessionId) });
    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async deleteAllSessions(userId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSessionEntity).delete({ userId });
    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async getUserSessions(userId: string): Promise<SafeUserSession[]> {
    const ds = await getDataSource();
    const sessions = await ds.getRepository(UserSessionEntity).find({
      where: { userId, sessionStatus: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    return sessions
      .filter((s) => s.sessionExpiry > new Date())
      .map((s) => SafeUserSessionSchema.parse(s));
  }

  // Auth delegates
  static getSession     = UserSessionAuthService.getSession.bind(UserSessionAuthService);
  static refreshTokens  = UserSessionAuthService.refreshTokens.bind(UserSessionAuthService);
}
