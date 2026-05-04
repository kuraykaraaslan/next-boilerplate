import 'reflect-metadata';
import { env } from '@/libs/env';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import redis from '@/libs/redis';
import { getSystemDataSource } from '@/libs/typeorm';
import { User as UserEntity } from '../user/entities/user.entity';
import Logger from '@/libs/logger';
import UserService from '../user/user.service';
import MailService from '../notification_mail/notification_mail.service';
import AuthMessages from './auth.messages';

export default class PasswordService {

  private static readonly RESET_TOKEN_EXPIRY_SECONDS = env.RESET_TOKEN_EXPIRY_SECONDS ?? 3600;
  private static readonly RESET_TOKEN_LENGTH = Math.max(4, env.RESET_TOKEN_LENGTH ?? 6);
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  static generateResetToken(length = PasswordService.RESET_TOKEN_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min)).toString().padStart(length, '0');
  }

  static async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static getRedisKey(email: string): string {
    return `reset-password:${email.toLowerCase()}`;
  }

  static getRateKey(email: string): string {
    return `reset-password-rate:${email.toLowerCase()}`;
  }

  static async forgotPassword({ email }: { email: string }): Promise<{ resetToken: string }> {
    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);

    const emailKey = user.email.toLowerCase();
    const tokenKey = PasswordService.getRedisKey(emailKey);
    const rateKey = PasswordService.getRateKey(emailKey);

    const currentRate = await redis.get(rateKey);
    if (currentRate) {
      const rateCount = parseInt(currentRate);
      if (rateCount >= PasswordService.RATE_LIMIT_MAX_ATTEMPTS) throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);
      await redis.set(rateKey, (rateCount + 1).toString(), 'EX', PasswordService.RATE_LIMIT_WINDOW_SECONDS);
    } else {
      await redis.set(rateKey, '1', 'EX', PasswordService.RATE_LIMIT_WINDOW_SECONDS);
    }

    await redis.del(tokenKey);

    const resetToken = PasswordService.generateResetToken();
    const hashedToken = await PasswordService.hashToken(resetToken);
    await redis.set(tokenKey, hashedToken, 'EX', PasswordService.RESET_TOKEN_EXPIRY_SECONDS);

    MailService.sendForgotPasswordEmail({ email: user.email, resetToken }).catch((err: unknown) => {
      Logger.warn(`PasswordService: sendForgotPasswordEmail failed: ${err instanceof Error ? err.message : err}`);
    });

    return { resetToken };
  }

  static async resetPassword({ email, resetToken, newPassword }: {
    email: string;
    resetToken: string;
    newPassword: string;
  }): Promise<void> {
    const user = await UserService.getByEmail(email);
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);

    const tokenKey = PasswordService.getRedisKey(user.email);
    const storedHashedToken = await redis.get(tokenKey);
    if (!storedHashedToken) throw new Error(AuthMessages.INVALID_TOKEN);

    const hashedInputToken = await PasswordService.hashToken(resetToken);
    if (hashedInputToken !== storedHashedToken) throw new Error(AuthMessages.INVALID_TOKEN);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const ds = await getSystemDataSource();
    await ds.getRepository(UserEntity).update({ userId: user.userId }, { password: hashedPassword });

    await redis.del(tokenKey);

    MailService.sendPasswordResetSuccessEmail({ email: user.email }).catch((err: unknown) => {
      Logger.warn(`PasswordService: sendPasswordResetSuccessEmail failed: ${err instanceof Error ? err.message : err}`);
    });
  }

  static async validateResetToken({ email, resetToken }: { email: string; resetToken: string }): Promise<boolean> {
    const user = await UserService.getByEmail(email);
    if (!user) return false;

    const tokenKey = PasswordService.getRedisKey(user.email);
    const storedHashedToken = await redis.get(tokenKey);
    if (!storedHashedToken) return false;

    const hashedInputToken = await PasswordService.hashToken(resetToken);
    return hashedInputToken === storedHashedToken;
  }

  static async invalidateResetToken({ email }: { email: string }): Promise<void> {
    const tokenKey = PasswordService.getRedisKey(email);
    await redis.del(tokenKey);
  }
}
