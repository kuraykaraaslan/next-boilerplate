import jwt, { Secret } from "jsonwebtoken";
import crypto from "crypto";
import { AppDataSource } from "@/libs/typeorm";
import redis from "@/libs/redis";
import { UserSessionEntity } from "./user_session.entity";
import { SafeUserSession, SafeUserSessionSchema } from "./user_session.types";
import { SafeUser } from "../user/user.types";
import { SafeUserSecurity } from "../user_security/user_security.types";
import UserSessionMessages from "./user_session.messages";
import Logger from "@/libs/logger";
import { v4 as uuidv4 } from "uuid";

const APPLICATION_DOMAIN = process.env.APPLICATION_DOMAIN || "kuray.dev";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1h";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const SESSION_EXPIRY_MS = parseInt(process.env.SESSION_EXPIRY_MS || `${1000 * 60 * 60 * 24 * 7}`); // 7 days
const SESSION_CACHE_TTL = parseInt(process.env.SESSION_CACHE_TTL || `${60 * 30}`); // 30 min

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("Missing JWT secrets in environment variables");
}

if (isNaN(SESSION_EXPIRY_MS)) {
  throw new Error("Invalid SESSION_EXPIRY_MS value in environment variables");
}

if (isNaN(SESSION_CACHE_TTL)) {
  throw new Error("Invalid SESSION_CACHE_TTL value in environment variables");
}

interface TokenPayload {
  userId: string;
  userSessionId: string;
  deviceFingerprint?: string;
}

export default class UserSessionService {
  private static get repository() {
    return AppDataSource.getRepository(UserSessionEntity);
  }

  /**
   * Hash a token using SHA-256
   */
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate device fingerprint from request headers
   */
  static generateDeviceFingerprint(headers: {
    ip?: string;
    userAgent?: string;
    acceptLanguage?: string;
  }): string {
    const raw = `${headers.ip || ""}|${headers.userAgent || ""}|${headers.acceptLanguage || ""}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(payload: TokenPayload): string {
    if (!ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not defined");
    }

    //@ts-ignore
    return jwt.sign(payload, ACCESS_TOKEN_SECRET as Secret, {
      subject: payload.userId,
      issuer: APPLICATION_DOMAIN,
      audience: "web",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(payload: TokenPayload): string {
    if (!REFRESH_TOKEN_SECRET) {
      throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }

    //@ts-ignore
    return jwt.sign(payload, REFRESH_TOKEN_SECRET as Secret, {
      subject: payload.userId,
      issuer: APPLICATION_DOMAIN,
      audience: "web",
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      notBefore: 5, // Valid after 5 seconds
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string, deviceFingerprint?: string): TokenPayload {
    if (!ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not defined");
    }

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret, {
        issuer: APPLICATION_DOMAIN,
        audience: "web",
      }) as TokenPayload;

      if (deviceFingerprint && decoded.deviceFingerprint !== deviceFingerprint) {
        throw new Error(UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH);
      }

      return decoded;
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(UserSessionMessages.TOKEN_EXPIRED);
      }
      throw new Error(UserSessionMessages.INVALID_TOKEN);
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    if (!REFRESH_TOKEN_SECRET) {
      throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }

    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET, {
        issuer: APPLICATION_DOMAIN,
        audience: "web",
      }) as TokenPayload;
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(UserSessionMessages.TOKEN_EXPIRED);
      }
      throw new Error(UserSessionMessages.INVALID_TOKEN);
    }
  }

  /**
   * Create a new session
   */
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

    const rawAccessToken = this.generateAccessToken({
      userId: user.userId,
      userSessionId,
      deviceFingerprint,
    });

    const rawRefreshToken = this.generateRefreshToken({
      userId: user.userId,
      userSessionId,
      deviceFingerprint,
    });

    const otpVerifyNeeded = !otpIgnore && userSecurity.otpMethods.length > 0;

    const session = this.repository.create({
      userSessionId,
      userId: user.userId,
      accessToken: this.hashToken(rawAccessToken),
      refreshToken: this.hashToken(rawRefreshToken),
      deviceFingerprint,
      userAgent,
      ipAddress,
      otpVerifyNeeded,
      sessionExpiry: new Date(Date.now() + SESSION_EXPIRY_MS),
    });

    const savedSession = await this.repository.save(session);

    return {
      userSession: SafeUserSessionSchema.parse(savedSession),
      rawAccessToken,
      rawRefreshToken,
    };
  }

  /**
   * Get session by access token
   */
  static async getSession({
    accessToken,
    deviceFingerprint,
    otpVerifyBypass = false,
  }: {
    accessToken: string;
    deviceFingerprint?: string;
    otpVerifyBypass?: boolean;
  }): Promise<SafeUserSession> {
    const decoded = this.verifyAccessToken(accessToken, deviceFingerprint);
    const hashedToken = this.hashToken(accessToken);

    // Try cache first
    const cacheKey = `session:${decoded.userId}:${hashedToken}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const session = JSON.parse(cached) as SafeUserSession;
      if (!otpVerifyBypass && session.otpVerifyNeeded) {
        throw new Error(UserSessionMessages.OTP_REQUIRED);
      }
      return session;
    }

    // Query database
    const session = await this.repository.findOne({
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

    // Cache the session
    await redis.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(safeSession));

    return safeSession;
  }

  /**
   * Refresh tokens
   */
  static async refreshTokens(refreshToken: string): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const decoded = this.verifyRefreshToken(refreshToken);
    const hashedRefreshToken = this.hashToken(refreshToken);

    const session = await this.repository.findOne({
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

    // Reuse detection
    if (session.refreshToken !== hashedRefreshToken) {
      // Token reuse detected - invalidate all sessions
      await this.repository.delete({ userId: session.userId });
      await this.clearUserSessionCache(session.userId);
      throw new Error(UserSessionMessages.REFRESH_TOKEN_REUSED);
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken({
      userId: session.userId,
      userSessionId: session.userSessionId,
      deviceFingerprint: session.deviceFingerprint,
    });

    const newRefreshToken = this.generateRefreshToken({
      userId: session.userId,
      userSessionId: session.userSessionId,
      deviceFingerprint: session.deviceFingerprint,
    });

    // Update session
    session.accessToken = this.hashToken(newAccessToken);
    session.refreshToken = this.hashToken(newRefreshToken);
    session.sessionExpiry = new Date(Date.now() + SESSION_EXPIRY_MS);

    const updatedSession = await this.repository.save(session);

    // Clear old cache
    await this.clearUserSessionCache(session.userId);

    return {
      userSession: SafeUserSessionSchema.parse(updatedSession),
      rawAccessToken: newAccessToken,
      rawRefreshToken: newRefreshToken,
    };
  }

  /**
   * Update session (e.g., mark OTP as verified)
   */
  static async updateSession(
    userSessionId: string,
    updates: Partial<Pick<UserSessionEntity, "otpVerifyNeeded" | "sessionStatus">>
  ): Promise<SafeUserSession> {
    const session = await this.repository.findOne({
      where: { userSessionId },
    });

    if (!session) {
      throw new Error(UserSessionMessages.SESSION_NOT_FOUND);
    }

    Object.assign(session, updates);
    const updatedSession = await this.repository.save(session);

    // Clear cache
    await this.clearUserSessionCache(session.userId);

    return SafeUserSessionSchema.parse(updatedSession);
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(userSessionId: string): Promise<void> {
    const session = await this.repository.findOne({
      where: { userSessionId },
    });

    if (session) {
      await this.repository.delete({ userSessionId });
      await this.clearUserSessionCache(session.userId);
    }
  }

  /**
   * Delete all other sessions for user
   */
  static async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.repository.delete({
      userId,
      userSessionId: currentSessionId ? undefined : undefined, // TypeORM doesn't support NOT directly
    });

    // Manual delete with query builder
    await this.repository
      .createQueryBuilder()
      .delete()
      .where("userId = :userId", { userId })
      .andWhere("userSessionId != :currentSessionId", { currentSessionId })
      .execute();

    await this.clearUserSessionCache(userId);
  }

  /**
   * Delete all sessions for user
   */
  static async deleteAllSessions(userId: string): Promise<void> {
    await this.repository.delete({ userId });
    await this.clearUserSessionCache(userId);
  }

  /**
   * Get all active sessions for user
   */
  static async getUserSessions(userId: string): Promise<SafeUserSession[]> {
    const sessions = await this.repository.find({
      where: {
        userId,
        sessionStatus: "ACTIVE",
      },
      order: { createdAt: "DESC" },
    });

    return sessions
      .filter((s) => s.sessionExpiry > new Date())
      .map((s) => SafeUserSessionSchema.parse(s));
  }

  /**
   * Clear session cache for user
   */
  private static async clearUserSessionCache(userId: string): Promise<void> {
    try {
      const pattern = `session:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      Logger.error(`Failed to clear session cache for user ${userId}`);
    }
  }
}
