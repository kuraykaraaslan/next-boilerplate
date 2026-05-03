import { env } from '@/libs/env';
import { systemPrisma } from "@/libs/prisma";
import redis from "@/libs/redis";
import { v4 as uuidv4 } from "uuid";
import { SafeUserSession, SafeUserSessionSchema, type SessionMeta } from "./user_session.types";
import { SafeUser } from "../user/user.types";
import { SafeUserSecurity } from "../user_security/user_security.types";
import UserSessionMessages from "./user_session.messages";
import UserSessionTokenService, { type TokenPayload } from "./user_session.token.service";
import UserSessionCacheService from "./user_session.cache.service";
import type { SessionStatus } from "./user_session.enums";

const IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const SESSION_EXPIRY_MS = parseInt(env.SESSION_EXPIRY_MS || `${1000 * 60 * 60 * 24 * 7}`); // 7 days
const SESSION_CACHE_TTL = parseInt(env.SESSION_CACHE_TTL || `${60 * 30}`); // 30 min

if (isNaN(SESSION_EXPIRY_MS)) {
  throw new Error("Invalid SESSION_EXPIRY_MS value in environment variables");
}

if (isNaN(SESSION_CACHE_TTL)) {
  throw new Error("Invalid SESSION_CACHE_TTL value in environment variables");
}

export default class UserSessionCrudService {
  static async createSession({
    user,
    userSecurity,
    deviceFingerprint,
    userAgent,
    ipAddress,
    otpIgnore = false,
  }: {
    user: SafeUser;
    userSecurity: SafeUserSecurity;
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    otpIgnore?: boolean;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const userSessionId = uuidv4();

    const rawAccessToken = UserSessionTokenService.generateAccessToken({
      userId: user.userId,
      userSessionId,
      deviceFingerprint,
    });

    const rawRefreshToken = UserSessionTokenService.generateRefreshToken({
      userId: user.userId,
      userSessionId,
      deviceFingerprint,
    });

    const otpVerifyNeeded = !otpIgnore && (userSecurity?.otpMethods?.length ?? 0) > 0;

    const session = await systemPrisma.userSession.create({
      data: {
        userSessionId,
        userId: user.userId,
        accessToken: UserSessionTokenService.hashToken(rawAccessToken),
        refreshToken: UserSessionTokenService.hashToken(rawRefreshToken),
        deviceFingerprint,
        userAgent,
        ipAddress,
        otpVerifyNeeded,
        sessionExpiry: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    return {
      userSession: SafeUserSessionSchema.parse(session),
      rawAccessToken,
      rawRefreshToken,
    };
  }

  static async createImpersonationSession({
    targetUser,
    impersonationMeta,
    userAgent,
    ipAddress,
  }: {
    targetUser: SafeUser;
    impersonationMeta: NonNullable<SessionMeta["impersonation"]>;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const userSessionId = uuidv4();

    const jwtPayload: TokenPayload = {
      userId: targetUser.userId,
      userSessionId,
      impersonation: impersonationMeta,
    };

    const rawAccessToken = UserSessionTokenService.generateAccessToken(jwtPayload);
    const rawRefreshToken = UserSessionTokenService.generateRefreshToken(jwtPayload);

    const metadata: SessionMeta = { impersonation: impersonationMeta };

    const session = await systemPrisma.userSession.create({
      data: {
        userSessionId,
        userId: targetUser.userId,
        accessToken: UserSessionTokenService.hashToken(rawAccessToken),
        refreshToken: UserSessionTokenService.hashToken(rawRefreshToken),
        userAgent,
        ipAddress,
        sessionExpiry: new Date(Date.now() + IMPERSONATION_SESSION_TTL_MS),
        metadata: metadata as any,
      },
    });

    return {
      userSession: SafeUserSessionSchema.parse(session),
      rawAccessToken,
      rawRefreshToken,
    };
  }

  static async getSession({
    accessToken,
    deviceFingerprint,
    otpVerifyBypass = false,
  }: {
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
        if (!otpVerifyBypass && session.otpVerifyNeeded) {
          throw new Error(UserSessionMessages.OTP_REQUIRED);
        }
        return session;
      } catch (parseError) {
        await redis.del(cacheKey);
      }
    }

    const session = await systemPrisma.userSession.findFirst({
      where: {
        accessToken: hashedToken,
        userId: decoded.userId,
      },
    });

    if (!session) {
      throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    }

    if (session.sessionExpiry < new Date()) {
      throw new Error(UserSessionMessages.SESSION_EXPIRED);
    }

    if (session.sessionStatus === "REVOKED") {
      throw new Error(UserSessionMessages.SESSION_REVOKED);
    }

    if (deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
      throw new Error(UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH);
    }

    if (!otpVerifyBypass && session.otpVerifyNeeded) {
      throw new Error(UserSessionMessages.OTP_REQUIRED);
    }

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

    const session = await systemPrisma.userSession.findFirst({
      where: {
        refreshToken: hashedRefreshToken,
        userId: decoded.userId,
      },
    });

    if (!session) {
      throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    }

    if (session.sessionExpiry < new Date()) {
      throw new Error(UserSessionMessages.SESSION_EXPIRED);
    }

    if (session.otpVerifyNeeded) {
      throw new Error(UserSessionMessages.OTP_REQUIRED);
    }

    // Block refresh of impersonation sessions
    if ((session.metadata as any)?.impersonation) {
      throw new Error(UserSessionMessages.INVALID_TOKEN);
    }

    // Reuse detection
    if (session.refreshToken !== hashedRefreshToken) {
      await systemPrisma.userSession.deleteMany({ where: { userId: session.userId } });
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

    const updatedSession = await systemPrisma.userSession.update({
      where: { userSessionId: session.userSessionId },
      data: {
        accessToken: UserSessionTokenService.hashToken(newAccessToken),
        refreshToken: UserSessionTokenService.hashToken(newRefreshToken),
        sessionExpiry: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    await UserSessionCacheService.clearUserSessionCache(session.userId);

    return {
      userSession: SafeUserSessionSchema.parse(updatedSession),
      rawAccessToken: newAccessToken,
      rawRefreshToken: newRefreshToken,
    };
  }

  static async updateSession(
    userSessionId: string,
    updates: Partial<Pick<{ otpVerifyNeeded: boolean; sessionStatus: SessionStatus }, "otpVerifyNeeded" | "sessionStatus">>
  ): Promise<SafeUserSession> {
    const session = await systemPrisma.userSession.findUnique({
      where: { userSessionId },
    });

    if (!session) {
      throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    }

    const updatedSession = await systemPrisma.userSession.update({
      where: { userSessionId },
      data: updates,
    });

    await UserSessionCacheService.clearUserSessionCache(session.userId);

    return SafeUserSessionSchema.parse(updatedSession);
  }

  static async deleteSession(userSessionId: string): Promise<void> {
    const session = await systemPrisma.userSession.findUnique({
      where: { userSessionId },
    });

    if (session) {
      await systemPrisma.userSession.delete({ where: { userSessionId } });
      await UserSessionCacheService.clearUserSessionCache(session.userId);
    }
  }

  static async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await systemPrisma.userSession.deleteMany({
      where: {
        userId,
        NOT: { userSessionId: currentSessionId },
      },
    });

    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async deleteAllSessions(userId: string): Promise<void> {
    await systemPrisma.userSession.deleteMany({ where: { userId } });
    await UserSessionCacheService.clearUserSessionCache(userId);
  }

  static async getUserSessions(userId: string): Promise<SafeUserSession[]> {
    const sessions = await systemPrisma.userSession.findMany({
      where: {
        userId,
        sessionStatus: "ACTIVE",
        sessionExpiry: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((s) => SafeUserSessionSchema.parse(s));
  }
}
