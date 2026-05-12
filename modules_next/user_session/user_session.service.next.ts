import Logger from '@/libs/logger';
import { env } from '@/libs/env';
// Utils
import { SafeUserSession, SafeUserSessionSchema, type SessionMeta } from '@/modules/user_session/user_session.types';
import { NextRequest } from 'next/server';
import { SafeUser, SafeUserSchema } from '@/modules/user/user.types';
import crypto from "crypto";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import redis from "@/libs/redis";
import { SafeUserSecurity } from '@/modules/user_security/user_security.types';
import UserSessionService from '@/modules/user_session/user_session.service';
import { getSystemDataSource } from '@/libs/typeorm';
import { User as UserEntity } from '@/modules/user/entities/user.entity';

const SESSION_CACHE_TTL = env.SESSION_CACHE_TTL;

export default class UserSessionNextService {


  /**
   * Generates a device fingerprint based on the request headers.
   * @param request - The HTTP request object.
   * @returns A promise that resolves to the device fingerprint.
   */
  static generateDeviceFingerprint(request: NextRequest): string {
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               request.headers.get("cf-connecting-ip") || 
               request.headers.get("remote-addr") || 
               request.headers.get("x-client-ip") || 
               request.headers.get("x-cluster-client-ip") || 
               request.headers.get("x-original-forwarded-for") || 
               request.headers.get("forwarded-for") || 
               request.headers.get("forwarded");
    const userAgent = request.headers.get("user-agent") || "";
    const acceptLanguage = request.headers.get("accept-language") || "";

    const rawFingerprint = `${ip}|${userAgent}|${acceptLanguage}`;
    return crypto.createHash("sha256").update(rawFingerprint).digest("hex");
  }

  /**
   * Creates a new user session from a Next.js request.
   * @param user - The safe user object.
   * @param request - The Next.js request object.
   * @param userSecurity - The user security settings.
   * @param otpIgnore - Whether to ignore OTP verification.
   * @returns The created session with raw tokens.
   */
  static async createSession({
    user,
    request,
    userSecurity,
    otpIgnore = false,
  }: {
    user: SafeUser;
    request: NextRequest;
    userSecurity: SafeUserSecurity;
    otpIgnore?: boolean;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    const deviceFingerprint = this.generateDeviceFingerprint(request);
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     undefined;

    return UserSessionService.createSession({
      user,
      userSecurity,
      deviceFingerprint,
      userAgent,
      ipAddress,
      otpIgnore,
    });
  }

  /**
   * Gets a user session by token from a Next.js request.
   * @param accessToken - The session token.
   * @param request - The Next.js request object.
   * @param otpVerifyBypass - Whether to bypass OTP verification.
   * @returns The user and session.
   */
  static async getSessionWithUser({
    accessToken,
    request,
    otpVerifyBypass = false,
  }: {
    accessToken: string;
    request: NextRequest;
    otpVerifyBypass?: boolean;
  }): Promise<{ user: SafeUser; userSession: SafeUserSession }> {
    const deviceFingerprint = this.generateDeviceFingerprint(request);
    const hashedToken = UserSessionService.hashToken(accessToken);

    // Try cache first
    const { userId } = UserSessionService.verifyAccessToken(accessToken, deviceFingerprint);
    const cacheKey = `session:${userId}:${hashedToken}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        // Validate cached data structure before parsing
        if (cachedData && cachedData.user && cachedData.userSession) {
          const user = SafeUserSchema.parse(cachedData.user);
          const userSession = SafeUserSessionSchema.parse(cachedData.userSession);
          if (!otpVerifyBypass && userSession.otpVerifyNeeded) {
            throw new Error(UserSessionMessages.OTP_REQUIRED);
          }
          return { user, userSession };
        } else {
          // Invalid cache structure, delete it and fall through to DB lookup
          Logger.warn('[UserSessionNextService] Invalid cache structure, deleting:', cacheKey);
          await redis.del(cacheKey);
        }
      } catch (error) {
        // Cache parsing failed, delete it and fall through to DB lookup
        Logger.error('[UserSessionNextService] Cache parsing failed:', error);
        await redis.del(cacheKey);
      }
    }

    // Get session from service
    const userSession = await UserSessionService.getSession({
      accessToken,
      deviceFingerprint,
      otpVerifyBypass,
    });

    // Get user from database
    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId: userSession.userId } });
    
    if (!user) {
      throw new Error(UserSessionMessages.USER_NOT_FOUND);
    }

    const safeUser = SafeUserSchema.parse(user);

    // Cache result
    await redis.setex(
      cacheKey,
      SESSION_CACHE_TTL,
      JSON.stringify({ user: safeUser, userSession })
    );

    return { user: safeUser, userSession };
  }

  /**
   * Get session from Next.js request.
   * @param accessToken - The access token.
   * @param request - The Next.js request object.
   * @param otpVerifyBypass - Whether to bypass OTP verification.
   * @returns The user and session.
   */
  static async getSession({
    accessToken,
    request,
    otpVerifyBypass = false,
  }: {
    accessToken: string;
    request: NextRequest;
    otpVerifyBypass?: boolean;
  }): Promise<{ user: SafeUser; userSession: SafeUserSession }> {
    return this.getSessionWithUser({ accessToken, request, otpVerifyBypass });
  }

  /**
   * Authenticate a user by Next.js request.
   * @param request - The Next.js request object.
   * @param requiredUserRole - The required user role.
   * @param otpVerifyBypass - Whether to bypass OTP verification.
   * @returns The authenticated user and session, or null for GUEST.
   */
  static async authenticateUserByRequest<T extends string = "USER">({
    request,
    requiredUserRole = "USER" as T,
    otpVerifyBypass = false,
  }: {
    request: NextRequest;
    requiredUserRole?: T;
    otpVerifyBypass?: boolean;
  }): Promise<
    T extends "GUEST"
      ? null
      : { user: SafeUser; userSession: SafeUserSession }
  > {
    try {
      const accessToken = request.cookies.get("accessToken")?.value;
      const refreshToken = request.cookies.get("refreshToken")?.value;

      if (!accessToken || !refreshToken) {
        throw new Error(UserSessionMessages.USER_NOT_AUTHENTICATED);
      }

      const { user, userSession } = await this.getSession({
        accessToken,
        request,
        otpVerifyBypass,
      });

      if (!user) {
        throw new Error(UserSessionMessages.USER_NOT_FOUND);
      }

      if (userSession.otpVerifyNeeded && !otpVerifyBypass) {
        throw new Error(UserSessionMessages.OTP_REQUIRED);
      }

      // Check if the session is expired
      if (userSession.sessionExpiry < new Date()) {
        throw new Error(UserSessionMessages.SESSION_EXPIRED);
      }

      // Role-based check
      const userRoleKeys = ["GUEST", "USER", "ADMIN"];
      const requiredUserRoleKeyIndex = userRoleKeys.indexOf(requiredUserRole);
      const userRoleKeyIndex = userRoleKeys.indexOf(user.userRole);

      if (userRoleKeyIndex < requiredUserRoleKeyIndex) {
        throw new Error(UserSessionMessages.USER_DOES_NOT_HAVE_REQUIRED_ROLE);
      }

      request.user = user;
      request.userSession = userSession;

      // Detect and attach impersonation context
      const meta = userSession.metadata as SessionMeta | null | undefined;
      if (meta?.impersonation) {
        request.isImpersonating = true;
        try {
          const ds2 = await getSystemDataSource();
          const impersonatorUser = await ds2.getRepository(UserEntity).findOne({
            where: { userId: meta.impersonation.impersonatorUserId },
          });
          if (impersonatorUser) {
            request.impersonatedBy = SafeUserSchema.parse(impersonatorUser);
          }
        } catch {
          // Non-critical — best effort
        }
      }

      return requiredUserRole === "GUEST" ? (null as any) : ({ user, userSession } as any);
    } catch (error: any) {
      Logger.error("[AUTHENTICATE ERROR]", {
        message: error.message,
        stack: error.stack,
        cookies: {
            hasAccessToken: !!request.cookies.get("accessToken"),
            hasRefreshToken: !!request.cookies.get("refreshToken")
        }
      });
      if (requiredUserRole !== "GUEST") {
        throw new Error(UserSessionMessages.USER_NOT_AUTHENTICATED);
      }
      request.user = null;
      return null as any;
    }
  }

  static async logout({ request }: { request: NextRequest }): Promise<void> {
    const accessToken = request.cookies.get("accessToken")?.value;
    if (accessToken) {
      const { userId } = UserSessionService.verifyAccessToken(accessToken, this.generateDeviceFingerprint(request));
      const hashedToken = UserSessionService.hashToken(accessToken);
      const cacheKey = `session:${userId}:${hashedToken}`;

      // Delete from cache
      const userSessionId = await redis.get(cacheKey).then(data => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.userSession && parsed.userSession.userSessionId) {
              return parsed.userSession.userSessionId;
            }
          } catch (e) {
            Logger.error('[UserSessionNextService.logout] Cache parsing error:', e);
          }
        }
        return null;
      });
      
      // Delete from database
      await UserSessionService.deleteSession(userSessionId!);
    }
  }

  static async deleteSession(userSession: SafeUserSession): Promise<void> {
    await UserSessionService.deleteSession(userSession.userSessionId);
  }
}




