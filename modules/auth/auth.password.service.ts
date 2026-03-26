import crypto from "crypto";
import bcrypt from "bcrypt";
import redis from "@/libs/redis";
import { prisma } from "@/libs/prisma";
import Logger from "@/libs/logger";
import UserService from "../user/user.service";
import MailService from "../notification_mail/notification_mail.service";
import AuthMessages from "./auth.messages";

export default class PasswordService {

  private static readonly RESET_TOKEN_EXPIRY_SECONDS = parseInt(
    process.env.RESET_TOKEN_EXPIRY_SECONDS || "3600"
  ); // 1 hour

  private static readonly RESET_TOKEN_LENGTH = Math.max(
    4,
    parseInt(process.env.RESET_TOKEN_LENGTH || "6")
  );

  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  /**
   * Generates a numeric reset token
   */
  static generateResetToken(length = this.RESET_TOKEN_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min))
      .toString()
      .padStart(length, "0");
  }

  /**
   * Hashes a token using SHA-256
   */
  static async hashToken(token: string): Promise<string> {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Gets the Redis key for password reset token
   */
  static getRedisKey(email: string): string {
    return `reset-password:${email.toLowerCase()}`;
  }

  /**
   * Gets the Redis key for rate limiting
   */
  static getRateKey(email: string): string {
    return `reset-password-rate:${email.toLowerCase()}`;
  }

  /**
   * Initiates the forgot password flow
   * Generates a reset token and stores it in Redis
   * @returns The reset token (to be sent via email/SMS)
   */
  static async forgotPassword({ email }: { email: string }): Promise<{ resetToken: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(AuthMessages.USER_NOT_FOUND);
    }

    const emailKey = user.email.toLowerCase();
    const tokenKey = this.getRedisKey(emailKey);
    const rateKey = this.getRateKey(emailKey);

    // Rate limiting check
    const currentRate = await redis.get(rateKey);
    if (currentRate) {
      const rateCount = parseInt(currentRate);
      if (rateCount >= this.RATE_LIMIT_MAX_ATTEMPTS) {
        throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);
      }
      await redis.set(rateKey, (rateCount + 1).toString(), "EX", this.RATE_LIMIT_WINDOW_SECONDS);
    } else {
      await redis.set(rateKey, "1", "EX", this.RATE_LIMIT_WINDOW_SECONDS);
    }

    // Invalidate any existing token
    await redis.del(tokenKey);

    // Generate and store new token
    const resetToken = this.generateResetToken();
    const hashedToken = await this.hashToken(resetToken);
    await redis.set(tokenKey, hashedToken, "EX", this.RESET_TOKEN_EXPIRY_SECONDS);

    // Send forgot password email (fire-and-forget — delivery failure must not block the flow)
    MailService.sendForgotPasswordEmail({ email: user.email, resetToken }).catch((err: unknown) => {
      Logger.warn(`PasswordService: sendForgotPasswordEmail failed: ${err instanceof Error ? err.message : err}`);
    });

    return { resetToken };
  }

  /**
   * Resets the user's password using a valid reset token
   */
  static async resetPassword({
    email,
    resetToken,
    newPassword,
  }: {
    email: string;
    resetToken: string;
    newPassword: string;
  }): Promise<void> {
    const user = await UserService.getByEmail(email);
    if (!user) {
      throw new Error(AuthMessages.USER_NOT_FOUND);
    }

    const tokenKey = this.getRedisKey(user.email);
    const storedHashedToken = await redis.get(tokenKey);

    if (!storedHashedToken) {
      throw new Error(AuthMessages.INVALID_TOKEN);
    }

    const hashedInputToken = await this.hashToken(resetToken);
    if (hashedInputToken !== storedHashedToken) {
      throw new Error(AuthMessages.INVALID_TOKEN);
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { userId: user.userId },
      data: { password: hashedPassword }
    });

    // Invalidate the token (one-time use)
    await redis.del(tokenKey);

    // Send password reset success email (fire-and-forget)
    MailService.sendPasswordResetSuccessEmail({ email: user.email }).catch((err: unknown) => {
      Logger.warn(`PasswordService: sendPasswordResetSuccessEmail failed: ${err instanceof Error ? err.message : err}`);
    });
  }

  /**
   * Validates a reset token without consuming it
   */
  static async validateResetToken({
    email,
    resetToken,
  }: {
    email: string;
    resetToken: string;
  }): Promise<boolean> {
    const user = await UserService.getByEmail(email);
    if (!user) {
      return false;
    }

    const tokenKey = this.getRedisKey(user.email);
    const storedHashedToken = await redis.get(tokenKey);

    if (!storedHashedToken) {
      return false;
    }

    const hashedInputToken = await this.hashToken(resetToken);
    return hashedInputToken === storedHashedToken;
  }

  /**
   * Invalidates any existing reset token for the user
   */
  static async invalidateResetToken({ email }: { email: string }): Promise<void> {
    const tokenKey = this.getRedisKey(email);
    await redis.del(tokenKey);
  }
}
