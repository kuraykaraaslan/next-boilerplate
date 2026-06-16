import 'reflect-metadata';
import { env } from '@nb/env';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import redis from '@nb/redis';
import { getDataSource } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import Logger from '@nb/logger';
import UserService from '@nb/user/server/user.service';
import UserSecurityService from '@nb/user_security/server/user_security.service';
import MailTemplatesService from '@nb/notification_mail/server/notification_mail.templates.service';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import { authEmailSubject } from './auth.i18n';
import type { AuthLocale } from './dictionaries';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AuditActions } from '@nb/audit_log/server/audit_log.enums';

export default class PasswordService {

  // GTH-3: env values are the fallback default; per-tenant reset-token knobs are
  // resolved at runtime via AuthPolicyService.getResetPolicy(tenantId).
  private static readonly RESET_TOKEN_LENGTH = Math.max(4, env.RESET_TOKEN_LENGTH ?? 6);
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  static generateResetToken(length = PasswordService.RESET_TOKEN_LENGTH): string {
    // KD-3: crypto-safe random — Math.random is predictable and unsuitable for tokens.
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    return crypto.randomInt(min, max).toString().padStart(length, '0');
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

  static async forgotPassword({ email, tenantId, locale }: { email: string; tenantId?: string; locale?: AuthLocale }): Promise<{ resetToken: string }> {
    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email } });

    // Non-enumerating: always apply rate-limit against the raw email key, then
    // return success regardless of whether the account exists — only send mail
    // when it does (prevents user-enumeration via timing or error messages).
    const emailKey = email.toLowerCase();
    const tokenKey = PasswordService.getRedisKey(emailKey);
    const rateKey = PasswordService.getRateKey(emailKey);

    const currentRate = await redis.get(rateKey);
    if (currentRate) {
      const rateCount = parseInt(currentRate);
      if (rateCount >= PasswordService.RATE_LIMIT_MAX_ATTEMPTS) throw new AppError(AuthMessages.RATE_LIMIT_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      await redis.set(rateKey, (rateCount + 1).toString(), 'EX', PasswordService.RATE_LIMIT_WINDOW_SECONDS);
    } else {
      await redis.set(rateKey, '1', 'EX', PasswordService.RATE_LIMIT_WINDOW_SECONDS);
    }

    if (!user) {
      // Silent success — do not reveal that the account doesn't exist.
      return { resetToken: '' };
    }

    await redis.del(tokenKey);

    // GTH-3: per-tenant reset-token TTL/length.
    const resetPolicy = await AuthPolicyService.getResetPolicy(tenantId);
    const resetToken = PasswordService.generateResetToken(resetPolicy.tokenLength);
    const hashedToken = await PasswordService.hashToken(resetToken);
    await redis.set(tokenKey, hashedToken, 'EX', resetPolicy.tokenExpirySeconds);

    // GTH-5: route reset mail through the request tenant's provider/branding.
    MailTemplatesService.sendForgotPasswordEmail({ tenantId: tenantId ?? ROOT_TENANT_ID, email: user.email, resetToken, subject: authEmailSubject('forgot_password', locale) }).catch((err: unknown) => {
      Logger.warn(`PasswordService: sendForgotPasswordEmail failed: ${err instanceof Error ? err.message : err}`);
    });

    AuditLogService.log({
      tenantId: null,
      actorId: user.userId,
      actorType: 'USER',
      action: AuditActions.AUTH_FORGOT_PASSWORD,
      metadata: { email: user.email },
    }).catch(() => {});

    return { resetToken };
  }

  static async resetPassword({ email, resetToken, newPassword, tenantId }: {
    email: string;
    resetToken: string;
    newPassword: string;
    tenantId?: string;
  }): Promise<void> {
    const user = await UserService.getByEmail(email);
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const tokenKey = PasswordService.getRedisKey(user.email);
    const storedHashedToken = await redis.get(tokenKey);
    if (!storedHashedToken) throw new AppError(AuthMessages.INVALID_TOKEN, 400, ErrorCode.VALIDATION_ERROR);

    const hashedInputToken = await PasswordService.hashToken(resetToken);
    if (hashedInputToken !== storedHashedToken) throw new AppError(AuthMessages.INVALID_TOKEN, 400, ErrorCode.VALIDATION_ERROR);

    // KD-5 / KD-7: enforce password policy + rotation history
    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(newPassword, policy, { email: user.email });
    if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

    const history = await UserSecurityService.getPasswordHistory(user.userId);
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);
      }
    }

    // GTH-6: per-tenant bcrypt cost.
    const { bcryptCost } = await AuthPolicyService.getCredentialPolicy(tenantId);
    const hashedPassword = await bcrypt.hash(newPassword, bcryptCost);
    const ds = await getDataSource();

    // Wrap password update + history push in a transaction.
    await ds.transaction(async (manager) => {
      await manager.getRepository(UserEntity).update({ userId: user.userId }, { password: hashedPassword });
      await UserSecurityService.pushPasswordHistory(user.userId, hashedPassword, policy.historyCount);
    });

    await UserService.invalidate({ userId: user.userId, email: user.email });
    await redis.del(tokenKey);

    AuditLogService.log({
      tenantId: tenantId ?? null,
      actorId: user.userId,
      actorType: 'USER',
      action: AuditActions.AUTH_PASSWORD_RESET,
      metadata: { email: user.email },
    }).catch(() => {});

    // GTH-5: route success mail through the request tenant's provider/branding.
    MailTemplatesService.sendPasswordResetSuccessEmail({ tenantId: tenantId ?? ROOT_TENANT_ID, email: user.email }).catch((err: unknown) => {
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
