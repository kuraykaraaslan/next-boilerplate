import 'reflect-metadata';
import { env } from '@nb/env';
import { getDataSource } from '@nb/db';
import { UserSession as UserSessionEntity } from './entities/user_session.entity';
import redis from '@nb/redis';
import { SafeUserSession, SafeUserSessionSchema, type SessionMeta } from './user_session.types';
import UserSessionMessages from './user_session.messages';
import UserSessionTokenService from './user_session.token.service';
import UserSessionCacheService from './user_session.cache.service';
import AuthPolicyService from '@nb/auth/server/auth.policy.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const SESSION_EXPIRY_MS = env.SESSION_EXPIRY_MS ?? (1000 * 60 * 60 * 24 * 7);
const SESSION_CACHE_TTL = env.SESSION_CACHE_TTL;

export default class UserSessionAuthService {

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

    // Resolve the idle-timeout policy against the SESSION's own tenant. The
    // caller may omit `tenantId` (e.g. token-only auth paths); falling back to
    // the system default would silently ignore a tenant's configured idle
    // timeout, so we prefer the explicit arg, then the tenantId stored in the
    // session metadata, then the system default.
    const resolveIdleTtl = async (sessionTenantId?: string): Promise<number> => {
      const policy = await AuthPolicyService.getSessionPolicy(tenantId ?? sessionTenantId);
      return Math.max(60, policy.idleTimeoutMinutes * 60);
    };

    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        const session = SafeUserSessionSchema.parse(JSON.parse(cached));
        const alive = await redis.get(idleKey);
        if (!alive) throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
        if (!otpVerifyBypass && session.otpVerifyNeeded) throw new AppError(UserSessionMessages.OTP_REQUIRED, 401, ErrorCode.OTP_REQUIRED);
        const idleTtl = await resolveIdleTtl(session.metadata?.tenantId);
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

    const sessionTenantId = (session.metadata as SessionMeta | null)?.tenantId;
    const idleTtl = await resolveIdleTtl(sessionTenantId);
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

    const session = await repo.findOne({ where: { userSessionId: decoded.userSessionId, userId: decoded.userId } });

    if (!session) throw new AppError(UserSessionMessages.SESSION_NOT_FOUND, 401, ErrorCode.UNAUTHORIZED);
    if (session.sessionExpiry < new Date()) throw new AppError(UserSessionMessages.SESSION_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
    if (session.otpVerifyNeeded) throw new AppError(UserSessionMessages.OTP_REQUIRED, 401, ErrorCode.OTP_REQUIRED);
    if ((session.metadata as SessionMeta | null)?.impersonation) throw new AppError(UserSessionMessages.INVALID_TOKEN, 401, ErrorCode.UNAUTHORIZED);

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

    const sessionTenantId = (session.metadata as import('./user_session.types').SessionMeta | null)?.tenantId;
    const sessionPolicy = await AuthPolicyService.getSessionPolicy(sessionTenantId);
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
}
