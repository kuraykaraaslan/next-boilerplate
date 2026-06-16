import { env } from '@nb/env';
import jwt, { Secret } from "jsonwebtoken";
import crypto from "crypto";
import UserSessionMessages from "./user_session.messages";
import { AppError, ErrorCode } from '@nb/common/server/app-error';

const APPLICATION_DOMAIN = env.APPLICATION_DOMAIN || "localhost";
const ACCESS_TOKEN_SECRET = env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = env.ACCESS_TOKEN_EXPIRES_IN || "1h";
const REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES_IN = env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: string;
  userSessionId: string;
  deviceFingerprint?: string;
  impersonation?: {
    impersonatorUserId: string;
    impersonatorSessionId: string;
    tenantId?: string;
    targetTenantRole?: string;
  };
}

export default class UserSessionTokenService {
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static generateDeviceFingerprint(headers: {
    ip?: string;
    userAgent?: string;
    acceptLanguage?: string;
  }): string {
    const raw = `${headers.ip || ""}|${headers.userAgent || ""}|${headers.acceptLanguage || ""}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  static generateAccessToken(payload: TokenPayload): string {
    return (jwt.sign as Function)(payload, ACCESS_TOKEN_SECRET, {
      subject: payload.userId,
      issuer: APPLICATION_DOMAIN,
      audience: "web",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return (jwt.sign as Function)(payload, REFRESH_TOKEN_SECRET, {
      subject: payload.userId,
      issuer: APPLICATION_DOMAIN,
      audience: "web",
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      notBefore: 5,
    });
  }

  static verifyAccessToken(token: string, deviceFingerprint?: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret, {
        issuer: APPLICATION_DOMAIN,
        audience: "web",
      }) as TokenPayload;

      if (deviceFingerprint && decoded.deviceFingerprint !== deviceFingerprint) {
        throw new AppError(UserSessionMessages.DEVICE_FINGERPRINT_MISMATCH, 401, ErrorCode.UNAUTHORIZED);
      }

      return decoded;
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(UserSessionMessages.TOKEN_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
      }
      throw new AppError(UserSessionMessages.INVALID_TOKEN, 401, ErrorCode.UNAUTHORIZED);
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET, {
        issuer: APPLICATION_DOMAIN,
        audience: "web",
      }) as TokenPayload;
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(UserSessionMessages.TOKEN_EXPIRED, 401, ErrorCode.SESSION_EXPIRED);
      }
      throw new AppError(UserSessionMessages.INVALID_TOKEN, 401, ErrorCode.UNAUTHORIZED);
    }
  }
}
