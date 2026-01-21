// Utils
import { SafeUserSession } from '@/modules/user_session/user_session.types';
import { NextRequest } from 'next/server';
import { SafeUser, SafeUserSchema } from '@/modules/user/user.types';
import crypto from "crypto";
import UserSessionMessages from "./user_session.messages";
import redis from "@/libs/redis";
import { SafeUserSecurity } from '@/modules/user_security/user_security.types';
import UserSessionService from './user_session.service';
import AppDataSource from '@/libs/typeorm';
import { UserEntity } from '../user/user.entity';

const SESSION_CACHE_TTL = parseInt(process.env.SESSION_CACHE_TTL || `${60 * 30}`); // 30 min default

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
      const { user, userSession } = JSON.parse(cached);
      if (!otpVerifyBypass && userSession.otpVerifyNeeded) {
        throw new Error(UserSessionMessages.OTP_REQUIRED);
      }
      return { user, userSession };
    }

    // Get session from service
    const userSession = await UserSessionService.getSession({
      accessToken,
      deviceFingerprint,
      otpVerifyBypass,
    });

    // Get user from database
    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({ where: { userId: userSession.userId } });
    
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

      // Check user role
      const userRoleKeys = ["GUEST", "USER", "ADMIN"];
      const requiredUserRoleKeyIndex = userRoleKeys.indexOf(requiredUserRole);
      const userRoleKeyIndex = userRoleKeys.indexOf(user.userRole);

      if (userRoleKeyIndex < requiredUserRoleKeyIndex) {
        throw new Error(UserSessionMessages.USER_DOES_NOT_HAVE_REQUIRED_ROLE);
      }

      // @ts-ignore
      request.user = user;
      return requiredUserRole === "GUEST" ? (null as any) : ({ user, userSession } as any);
    } catch (error: any) {
      if (requiredUserRole !== "GUEST") {
        throw new Error(UserSessionMessages.USER_NOT_AUTHENTICATED);
      }
      // @ts-ignore
      request.user = null;
      return null as any;
    }
  }

  static async deleteSession(userSession: SafeUserSession): Promise<void> {
    await UserSessionService.deleteSession(userSession.userSessionId);
  }
}




