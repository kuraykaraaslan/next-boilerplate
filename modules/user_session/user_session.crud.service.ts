import 'reflect-metadata';
import { env } from '@/modules/env';
import { Not } from 'typeorm';
import { getDataSource } from '@/modules/db';
import { UserSession as UserSessionEntity } from './entities/user_session.entity';
import redis from '@/modules/redis';
import { v4 as uuidv4 } from 'uuid';
import { SafeUserSession, SafeUserSessionSchema, type SessionMeta } from './user_session.types';
import { SafeUser } from '../user/user.types';
import { SafeUserSecurity } from '../user_security/user_security.types';
import UserSessionMessages from './user_session.messages';
import UserSessionTokenService, { type TokenPayload } from './user_session.token.service';
import UserSessionCacheService from './user_session.cache.service';
import type { SessionStatus } from './user_session.enums';
import AuthPolicyService from '@/modules/auth/auth.policy.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000;
const SESSION_EXPIRY_MS = env.SESSION_EXPIRY_MS ?? (1000 * 60 * 60 * 24 * 7);
const SESSION_CACHE_TTL = env.SESSION_CACHE_TTL;

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

    // KD-12: cap the absolute session lifetime at the policy ceiling. The
    // refresh-token TTL stays available for axios-style silent refresh, but
    // the *session record* cannot outlive `sessionAbsoluteMaxHours`.
    const sessionPolicy = await AuthPolicyService.getSessionPolicy(tenantId);
    const absoluteCapMs = sessionPolicy.absoluteMaxHours * 60 * 60 * 1000;
    const expiryMs = Math.min(SESSION_EXPIRY_MS, absoluteCapMs);

    const ds = await getDataSource();

    // KD-21: when single-session-only is enabled (sysadmin > tenant), drop all
    // prior active sessions for the user before issuing the new one.
    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (accessPolicy.singleSessionOnly) {
      await ds.getRepository(UserSessionEntity).delete({ userId: user.userId });
      await UserSessionCacheService.clearUserSessionCache(user.userId);
    }

    const repo = ds.getRepository(UserSessionEntity);
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
    });
    const saved = await repo.save(session);

    // KD-11: seed the idle key so the very first authenticated request after
    // login finds the session alive.
    await redis
      .setex(`session:idle:${userSessionId}`, Math.max(60, sessionPolicy.idleTimeoutMinutes * 60), '1')
      .catch(() => {});

    return { userSession: SafeUserSessionSchema.parse(saved), rawAccessToken, rawRefreshToken };
  }

  static async createImpersonationSession({ targetUser, impersonationMeta, userAgent, ipAddress }: {
    targetUser: SafeUser;
    impersonationMeta: NonNullable<SessionMeta['impersonation']>;
    userAgent?: string;
    ipAddress?: string;
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
      sessionExpiry: new Date(Date.now() + IMPERSONATION_SESSION_TTL_MS),
      metadata: metadata as unknown,
    });
    const saved = await repo.save(session);
    return { userSession: SafeUserSessionSchema.parse(saved), rawAccessToken, rawRefreshToken };
  }

  static async getSession({ accessToken, deviceFingerprint, otpVerifyBypass = false, tenantId }: {
    accessToken: string;
    deviceFingerprint?: string;
    otpVerifyBypass?: boolean;
    tenantId?: string;
  }): Promise<SafeUserSession> {
    const decoded = UserSessionTokenService.verifyAccessToken(accessToken, deviceFingerprint);
    const hashedToken = UserSessionTokenService.hashToken(accessToken);
    const cacheKey = `session:${decoded.userId}:${hashedToken}`;
    const idleKey = `session:idle:${decoded.userSessionId}`;

    // KD-11: idle-timeout enforcement. We track the "still-alive" flag in
    // Redis with a TTL equal to `idleTimeoutMinutes` so refresh is a single
    // SET; no DB write on every request.
    const sessionPolicy = await AuthPolicyService.getSessionPolicy(tenantId);
    const idleTtl = Math.max(60, sessionPolicy.idleTimeoutMinutes * 60);

    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        const session = SafeUserSessionSchema.parse(JSON.parse(cached));
        // Idle key absent → user was away longer than the timeout.
        const alive = await redis.get(idleKey);
        if (!alive) throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
        if (!otpVerifyBypass && session.otpVerifyNeeded) throw new AppError(UserSessionMessages.OTP_REQUIRED, 401, ErrorCode.OTP_REQUIRED);
        await redis.expire(idleKey, idleTtl).catch(() => {});
        return session;
      } catch (err: unknown) {
        if (err instanceof AppError && err.code === ErrorCode.SESSION_EXPIRED) throw err;
        await redis.del(cacheKey);
      }
    }

    const ds = await getDataSource();
    const session = await ds.getRepository(UserSessionEntity).findOne({
      where: { accessToken: hashedToken, userId: decoded.userId },
    });

    if (!session) throw new AppError(UserSessionMessages.SESSION_NOT_FOUND, 401, ErrorCode.UNAUTHORIZED);
    if (session.sessionExpiry < new Date()) throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
    if (session.sessionStatus === 'REVOKED') throw new AppError(UserSessionMessages.SESSION_REVOKED, 401, ErrorCode.UNAUTHORIZED);
    if (deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
      throw new AppError(UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH, 401, ErrorCode.UNAUTHORIZED);
    }
    if (!otpVerifyBypass && session.otpVerifyNeeded) throw new AppError(UserSessionMessages.OTP_REQUIRED, 401, ErrorCode.OTP_REQUIRED);

    // KD-11: also check DB-level idle when cache missed. We compare against
    // the session row's `updatedAt` so existing sessions without a Redis idle
    // key still get a fair grace window (their last DB touch).
    const lastActivityMs = (session.updatedAt ?? session.createdAt).getTime();
    if (Date.now() - lastActivityMs > idleTtl * 1000) {
      throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
    }

    const safeSession = SafeUserSessionSchema.parse(session);
    await redis.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(safeSession));
    await redis.setex(idleKey, idleTtl, '1').catch(() => {});
    return safeSession;
  }

  static async refreshTokens(refreshToken: string): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const decoded = UserSessionTokenService.verifyRefreshToken(refreshToken);
    const hashedRefreshToken = UserSessionTokenService.hashToken(refreshToken);

    const ds = await getDataSource();
    const repo = ds.getRepository(UserSessionEntity);

    // Look up by userSessionId (from the decoded JWT) so the hash comparison below
    // can actually detect token reuse. If we queried by the hash we'd never find a
    // row with a mismatching hash, making the reuse branch unreachable.
    const session = await repo.findOne({ where: { userSessionId: decoded.userSessionId, userId: decoded.userId } });

    if (!session) throw new AppError(UserSessionMessages.SESSION_NOT_FOUND, 401, ErrorCode.UNAUTHORIZED);
    if (session.sessionExpiry < new Date()) throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
    if (session.otpVerifyNeeded) throw new AppError(UserSessionMessages.OTP_REQUIRED, 401, ErrorCode.OTP_REQUIRED);
    if ((session.metadata as SessionMeta | null)?.impersonation) throw new AppError(UserSessionMessages.INVALID_TOKEN, 401, ErrorCode.UNAUTHORIZED);

    // Reuse detection: if the stored token no longer matches the presented one,
    // a prior refresh already rotated it — revoke the entire session family.
    if (session.refreshToken !== hashedRefreshToken) {
      await repo.delete({ userId: session.userId });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
      throw new AppError(UserSessionMessages.REFRESH_TOKEN_REUSED, 401, ErrorCode.UNAUTHORIZED);
    }

    const newAccessToken = UserSessionTokenService.generateAccessToken({
      userId: session.userId,
      userSessionId: session.userSessionId,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
    });
    const newRefreshToken = UserSessionTokenService.generateRefreshToken({
      userId: session.userId,
      userSessionId: session.userSessionId,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
    });

    // KD-12: the renewed expiry can never exceed the original session's
    // absolute lifetime ceiling (createdAt + absoluteMaxHours).
    const sessionPolicy = await AuthPolicyService.getSessionPolicy();
    const absoluteDeadline = session.createdAt.getTime() + sessionPolicy.absoluteMaxHours * 60 * 60 * 1000;
    if (Date.now() >= absoluteDeadline) {
      await repo.delete({ userSessionId: session.userSessionId });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
      throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
    }
    const renewedExpiryMs = Math.min(Date.now() + SESSION_EXPIRY_MS, absoluteDeadline);

    await repo.update({ userSessionId: session.userSessionId }, {
      accessToken: UserSessionTokenService.hashToken(newAccessToken),
      refreshToken: UserSessionTokenService.hashToken(newRefreshToken),
      sessionExpiry: new Date(renewedExpiryMs),
    });
    await UserSessionCacheService.clearUserSessionCache(session.userId);
    const updated = await repo.findOne({ where: { userSessionId: session.userSessionId } });

    return { userSession: SafeUserSessionSchema.parse(updated!), rawAccessToken: newAccessToken, rawRefreshToken: newRefreshToken };
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
}
