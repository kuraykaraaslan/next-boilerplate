import 'reflect-metadata';
import { env } from '@/modules/env';
import { Not } from 'typeorm';
import { getSystemDataSource } from '@/modules/db';
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

const IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000;
const SESSION_EXPIRY_MS = env.SESSION_EXPIRY_MS ?? (1000 * 60 * 60 * 24 * 7);
const SESSION_CACHE_TTL = env.SESSION_CACHE_TTL;

export default class UserSessionCrudService {

  static async createSession({ user, userSecurity, deviceFingerprint, userAgent, ipAddress, otpIgnore = false }: {
    user: SafeUser;
    userSecurity: SafeUserSecurity;
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    otpIgnore?: boolean;
  }): Promise<{ userSession: SafeUserSession; rawAccessToken: string; rawRefreshToken: string }> {
    const userSessionId = uuidv4();
    const rawAccessToken = UserSessionTokenService.generateAccessToken({ userId: user.userId, userSessionId, deviceFingerprint });
    const rawRefreshToken = UserSessionTokenService.generateRefreshToken({ userId: user.userId, userSessionId, deviceFingerprint });
    const otpVerifyNeeded = !otpIgnore && (userSecurity?.otpMethods?.length ?? 0) > 0;

    const ds = await getSystemDataSource();
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
      sessionExpiry: new Date(Date.now() + SESSION_EXPIRY_MS),
    });
    const saved = await repo.save(session);
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

    const ds = await getSystemDataSource();
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

  static async getSession({ accessToken, deviceFingerprint, otpVerifyBypass = false }: {
    accessToken: string;
    deviceFingerprint?: string;
    otpVerifyBypass?: boolean;
  }): Promise<SafeUserSession> {
    const decoded = UserSessionTokenService.verifyAccessToken(accessToken, deviceFingerprint);
    const hashedToken = UserSessionTokenService.hashToken(accessToken);
    const cacheKey = `session:${decoded.userId}:${hashedToken}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        const session = SafeUserSessionSchema.parse(JSON.parse(cached));
        if (!otpVerifyBypass && session.otpVerifyNeeded) throw new Error(UserSessionMessages.OTP_REQUIRED);
        return session;
      } catch {
        await redis.del(cacheKey);
      }
    }

    const ds = await getSystemDataSource();
    const session = await ds.getRepository(UserSessionEntity).findOne({
      where: { accessToken: hashedToken, userId: decoded.userId },
    });

    if (!session) throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    if (session.sessionExpiry < new Date()) throw new Error(UserSessionMessages.SESSION_EXPIRED);
    if (session.sessionStatus === 'REVOKED') throw new Error(UserSessionMessages.SESSION_REVOKED);
    if (deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
      throw new Error(UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH);
    }
    if (!otpVerifyBypass && session.otpVerifyNeeded) throw new Error(UserSessionMessages.OTP_REQUIRED);

    const safeSession = SafeUserSessionSchema.parse(session);
    await redis.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(safeSession));
    return safeSession;
  }

  static async refreshTokens(refreshToken: string): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const decoded = UserSessionTokenService.verifyRefreshToken(refreshToken);
    const hashedRefreshToken = UserSessionTokenService.hashToken(refreshToken);

    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = await repo.findOne({ where: { refreshToken: hashedRefreshToken, userId: decoded.userId } });

    if (!session) throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    if (session.sessionExpiry < new Date()) throw new Error(UserSessionMessages.SESSION_EXPIRED);
    if (session.otpVerifyNeeded) throw new Error(UserSessionMessages.OTP_REQUIRED);
    if ((session.metadata as any)?.impersonation) throw new Error(UserSessionMessages.INVALID_TOKEN);
    if (session.refreshToken !== hashedRefreshToken) {
      await repo.delete({ userId: session.userId });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
      throw new Error(UserSessionMessages.REFRESH_TOKEN_REUSED);
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

    await repo.update({ userSessionId: session.userSessionId }, {
      accessToken: UserSessionTokenService.hashToken(newAccessToken),
      refreshToken: UserSessionTokenService.hashToken(newRefreshToken),
      sessionExpiry: new Date(Date.now() + SESSION_EXPIRY_MS),
    });
    await UserSessionCacheService.clearUserSessionCache(session.userId);
    const updated = await repo.findOne({ where: { userSessionId: session.userSessionId } });

    return { userSession: SafeUserSessionSchema.parse(updated!), rawAccessToken: newAccessToken, rawRefreshToken: newRefreshToken };
  }

  static async updateSession(
    userSessionId: string,
    updates: Partial<Pick<{ otpVerifyNeeded: boolean; sessionStatus: SessionStatus }, 'otpVerifyNeeded' | 'sessionStatus'>>
  ): Promise<SafeUserSession> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = await repo.findOne({ where: { userSessionId } });
    if (!session) throw new Error(UserSessionMessages.SESSION_NOT_FOUND);

    await repo.update({ userSessionId }, updates as any);
    await UserSessionCacheService.clearUserSessionCache(session.userId);
    const updated = await repo.findOne({ where: { userSessionId } });
    return SafeUserSessionSchema.parse(updated!);
  }

  static async deleteSession(userSessionId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSessionEntity);
    const session = await repo.findOne({ where: { userSessionId } });
    if (session) {
      await repo.delete({ userSessionId });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
    }
  }

  static async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const ds = await getSystemDataSource();
    await ds.getRepository(UserSessionEntity).delete({ userId, userSessionId: Not(currentSessionId) });
    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async deleteAllSessions(userId: string): Promise<void> {
    const ds = await getSystemDataSource();
    await ds.getRepository(UserSessionEntity).delete({ userId });
    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async getUserSessions(userId: string): Promise<SafeUserSession[]> {
    const ds = await getSystemDataSource();
    const sessions = await ds.getRepository(UserSessionEntity).find({
      where: { userId, sessionStatus: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    return sessions
      .filter((s) => s.sessionExpiry > new Date())
      .map((s) => SafeUserSessionSchema.parse(s));
  }
}
