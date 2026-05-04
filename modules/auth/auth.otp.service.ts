import { env } from '@/libs/env';
import crypto from "crypto";
import redis from "@/libs/redis";
import { SafeUser } from "../user/user.types";
import { SafeUserSession } from "../user_session/user_session.types";
import { OTPMethod, OTPAction } from "../user_security/user_security.enums";
import UserSessionService from "../user_session/user_session.service";
import MailService from "../notification_mail/notification_mail.service";
import SMSService from "../notification_sms/notification_sms.service";
import AuthMessages from "./auth.messages";
import Logger from "@/libs/logger";

export default class OTPService {
  private static readonly OTP_LENGTH = env.OTP_LENGTH ?? 6;
  private static readonly OTP_EXPIRY_SECONDS = env.OTP_EXPIRY_SECONDS ?? 600;
  private static readonly OTP_RATE_LIMIT_SECONDS = env.OTP_RATE_LIMIT_SECONDS ?? 60;
  private static readonly OTP_MAX_ATTEMPTS = env.OTP_MAX_ATTEMPTS ?? 5;

  /**
   * Generate a numeric OTP token
   */
  static generateToken(length = OTPService.OTP_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + crypto.randomInt(max - min + 1))
      .toString()
      .padStart(length, "0");
  }

  /**
   * Hash OTP token
   */
  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Get Redis key for OTP
   */
  private static getOTPKey(userSessionId: string, method: OTPMethod, action: OTPAction): string {
    return `otp:${action}:${userSessionId}:${method}`;
  }

  /**
   * Get Redis key for rate limiting
   */
  private static getRateKey(userSessionId: string, method: OTPMethod): string {
    return `otp:rate:${userSessionId}:${method}`;
  }

  /**
   * Get Redis key for attempt tracking
   */
  private static getAttemptKey(userSessionId: string, method: OTPMethod, action: OTPAction): string {
    return `otp:attempts:${userSessionId}:${method}:${action}`;
  }

  /**
   * Request OTP - generates and sends OTP via specified method
   */
  static async requestOTP({
    user,
    userSession,
    method,
    action,
  }: {
    user: SafeUser;
    userSession: SafeUserSession;
    method: OTPMethod;
    action: OTPAction;
  }): Promise<{ otpToken: string }> {
    if (method === "TOTP_APP") {
      throw new Error(AuthMessages.USE_AUTHENTICATOR_APP);
    }

    const rateKey = this.getRateKey(userSession.userSessionId, method);

    // Check rate limit
    const rateCount = await redis.get(rateKey);
    if (rateCount && parseInt(rateCount) >= this.OTP_MAX_ATTEMPTS) {
      throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);
    }

    // Increment rate limit
    if (rateCount) {
      await redis.incr(rateKey);
    } else {
      await redis.setex(rateKey, this.OTP_RATE_LIMIT_SECONDS, "1");
    }

    // Validate delivery prerequisites before generating the OTP
    if (method === "SMS" && !user.phone) {
      throw new Error(AuthMessages.USER_HAS_NO_PHONE_NUMBER);
    }

    // Generate OTP
    const otpToken = this.generateToken();
    const hashedToken = this.hashToken(otpToken);

    // Store OTP
    const otpKey = this.getOTPKey(userSession.userSessionId, method, action);
    await redis.setex(otpKey, this.OTP_EXPIRY_SECONDS, hashedToken);

    // Send OTP — delivery failures are logged but must NOT propagate to the frontend
    switch (method) {
      case "EMAIL":
        MailService.sendOTPEmail({ email: user.email, otpToken }).catch((err: unknown) => {
          Logger.error(`OTPService: sendOTPEmail failed for user ${user.userId}: ${err instanceof Error ? err.message : err}`);
        });
        break;

      case "SMS":
        SMSService.sendShortMessage({
          to: user.phone!,
          body: `Your verification code is ${otpToken}. Valid for ${this.OTP_EXPIRY_SECONDS / 60} minutes.`,
        }).catch((err: unknown) => {
          Logger.error(`OTPService: sendShortMessage failed for user ${user.userId}: ${err instanceof Error ? err.message : err}`);
        });
        break;

      default:
        throw new Error(AuthMessages.INVALID_OTP_METHOD);
    }

    Logger.info(`OTP sent via ${method} to user ${user.userId}`);
    
    return { otpToken };
  }

  /**
   * Verify OTP
   */
  static async verifyOTP({
    user,
    userSession,
    method,
    action,
    otpToken,
  }: {
    user: SafeUser;
    userSession: SafeUserSession;
    method: OTPMethod;
    action: OTPAction;
    otpToken: string;
  }): Promise<{ verified: boolean }> {
    if (method === "TOTP_APP") {
      throw new Error(AuthMessages.USE_AUTHENTICATOR_APP);
    }

    const otpKey = this.getOTPKey(userSession.userSessionId, method, action);
    const attemptKey = this.getAttemptKey(userSession.userSessionId, method, action);

    // Check attempt limit
    const attempts = await redis.get(attemptKey);
    if (attempts && parseInt(attempts) >= this.OTP_MAX_ATTEMPTS) {
      // Clear the OTP on too many attempts
      await redis.del(otpKey);
      throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);
    }

    // Get stored OTP
    const storedHash = await redis.get(otpKey);
    if (!storedHash) {
      throw new Error(AuthMessages.OTP_EXPIRED);
    }

    // Verify OTP
    const inputHash = this.hashToken(otpToken);
    if (inputHash !== storedHash) {
      // Increment attempt counter
      if (attempts) {
        await redis.incr(attemptKey);
      } else {
        await redis.setex(attemptKey, this.OTP_EXPIRY_SECONDS, "1");
      }
      throw new Error(AuthMessages.INVALID_OTP);
    }

    // Clean up on success
    await redis.del(otpKey);
    await redis.del(attemptKey);
    await redis.del(this.getRateKey(userSession.userSessionId, method));

    // If this was for authentication, mark session as verified
    if (action === "authenticate" && userSession.otpVerifyNeeded) {
      await UserSessionService.updateSession(userSession.userSessionId, {
        otpVerifyNeeded: false,
      });
    }

    Logger.info(`OTP verified via ${method} for user ${user.userId}`);

    return { verified: true };
  }

  /**
   * Invalidate all OTPs for a session
   */
  static async invalidateSessionOTPs(userSessionId: string): Promise<void> {
    const methods: OTPMethod[] = ["EMAIL", "SMS"];
    const actions: OTPAction[] = ["enable", "disable", "authenticate"];

    for (const method of methods) {
      for (const action of actions) {
        await redis.del(this.getOTPKey(userSessionId, method, action));
        await redis.del(this.getAttemptKey(userSessionId, method, action));
      }
      await redis.del(this.getRateKey(userSessionId, method));
    }
  }
}
