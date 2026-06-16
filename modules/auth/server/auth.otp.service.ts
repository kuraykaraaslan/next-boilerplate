import { env } from '@nb/env';
import crypto from "crypto";
import redis from "@nb/redis";
import { SafeUser } from "@nb/user/server/user.types";
import { SafeUserSession } from "@nb/user_session/server/user_session.types";
import { OTPMethod, OTPAction } from "@nb/user_security/server/user_security.enums";
import UserSessionService from "@nb/user_session/server/user_session.service";
import MailTemplatesService from "@nb/notification_mail/server/notification_mail.templates.service";
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import SMSService from "@nb/notification_sms/server/notification_sms.service";
import AuthMessages from "./auth.messages";
import AuthPolicyService from "./auth.policy.service";
import { authEmailSubject } from "./auth.i18n";
import type { AuthLocale } from "./dictionaries";
import Logger from "@nb/logger";
import { AppError, ErrorCode } from '@nb/common/server/app-error';

export default class OTPService {
  // GTH-3: env values are the fallback default only; per-tenant OTP knobs are
  // resolved at runtime via AuthPolicyService.getOtpPolicy(tenantId).
  private static readonly OTP_LENGTH = env.OTP_LENGTH ?? 6;

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
    tenantId,
    locale,
  }: {
    user: SafeUser;
    userSession: SafeUserSession;
    method: OTPMethod;
    action: OTPAction;
    /** GTH-3/5/13: per-tenant TTLs, mail routing, and MFA method allow-list. */
    tenantId?: string;
    /** GTH-10: recipient locale for the transactional email subject. */
    locale?: AuthLocale;
  }): Promise<{ otpToken: string }> {
    if (method === "TOTP_APP") {
      throw new AppError(AuthMessages.USE_AUTHENTICATOR_APP, 400, ErrorCode.VALIDATION_ERROR);
    }

    // GTH-13: enforce the tenant's MFA method allow-list. Empty = all allowed.
    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (accessPolicy.mfaAllowedMethods.length > 0 && !accessPolicy.mfaAllowedMethods.includes(method as any)) {
      throw new AppError(AuthMessages.MFA_METHOD_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
    }

    // GTH-3: per-tenant OTP knobs (length/expiry/rate-limit/attempts).
    const otpPolicy = await AuthPolicyService.getOtpPolicy(tenantId);

    const rateKey = this.getRateKey(userSession.userSessionId, method);

    // Check rate limit
    const rateCount = await redis.get(rateKey);
    if (rateCount && parseInt(rateCount) >= otpPolicy.maxAttempts) {
      throw new AppError(AuthMessages.RATE_LIMIT_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }

    // Increment rate limit
    if (rateCount) {
      await redis.incr(rateKey);
    } else {
      await redis.setex(rateKey, otpPolicy.rateLimitSeconds, "1");
    }

    // Validate delivery prerequisites before generating the OTP
    if (method === "SMS" && !user.phone) {
      throw new AppError(AuthMessages.USER_HAS_NO_PHONE_NUMBER, 422, ErrorCode.VALIDATION_ERROR);
    }

    // Generate OTP
    const otpToken = this.generateToken(otpPolicy.length);
    const hashedToken = this.hashToken(otpToken);

    // Store OTP
    const otpKey = this.getOTPKey(userSession.userSessionId, method, action);
    await redis.setex(otpKey, otpPolicy.expirySeconds, hashedToken);

    // GTH-5: route auth mail/SMS through the request tenant's own provider +
    // branding; fall back to the root tenant when no tenant context is present.
    const deliveryTenantId = tenantId ?? ROOT_TENANT_ID;

    // Send OTP — delivery failures are logged but must NOT propagate to the frontend
    switch (method) {
      case "EMAIL":
        MailTemplatesService.sendOTPEmail({ tenantId: deliveryTenantId, email: user.email, otpToken, subject: authEmailSubject('otp', locale) }).catch((err: unknown) => {
          Logger.error(`OTPService: sendOTPEmail failed for user ${user.userId}: ${err instanceof Error ? err.message : err}`);
        });
        break;

      case "SMS":
        SMSService.sendShortMessage(deliveryTenantId, {
          to: user.phone!,
          body: `Your verification code is ${otpToken}. Valid for ${Math.round(otpPolicy.expirySeconds / 60)} minutes.`,
        }).catch((err: unknown) => {
          Logger.error(`OTPService: sendShortMessage failed for user ${user.userId}: ${err instanceof Error ? err.message : err}`);
        });
        break;

      default:
        throw new AppError(AuthMessages.INVALID_OTP_METHOD, 400, ErrorCode.VALIDATION_ERROR);
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
    tenantId,
  }: {
    user: SafeUser;
    userSession: SafeUserSession;
    method: OTPMethod;
    action: OTPAction;
    otpToken: string;
    tenantId?: string;
  }): Promise<{ verified: boolean }> {
    if (method === "TOTP_APP") {
      throw new AppError(AuthMessages.USE_AUTHENTICATOR_APP, 400, ErrorCode.VALIDATION_ERROR);
    }

    const otpPolicy = await AuthPolicyService.getOtpPolicy(tenantId);
    const otpKey = this.getOTPKey(userSession.userSessionId, method, action);
    const attemptKey = this.getAttemptKey(userSession.userSessionId, method, action);

    // Check attempt limit
    const attempts = await redis.get(attemptKey);
    if (attempts && parseInt(attempts) >= otpPolicy.maxAttempts) {
      // Clear the OTP on too many attempts
      await redis.del(otpKey);
      throw new AppError(AuthMessages.RATE_LIMIT_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }

    // Get stored OTP
    const storedHash = await redis.get(otpKey);
    if (!storedHash) {
      throw new AppError(AuthMessages.OTP_EXPIRED, 400, ErrorCode.VALIDATION_ERROR);
    }

    // Verify OTP
    const inputHash = this.hashToken(otpToken);
    if (inputHash !== storedHash) {
      // Increment attempt counter
      if (attempts) {
        await redis.incr(attemptKey);
      } else {
        await redis.setex(attemptKey, otpPolicy.expirySeconds, "1");
      }
      throw new AppError(AuthMessages.INVALID_OTP, 401, ErrorCode.INVALID_CREDENTIALS);
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
