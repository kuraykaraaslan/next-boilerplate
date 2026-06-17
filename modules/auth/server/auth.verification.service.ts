import 'reflect-metadata';
import crypto from 'crypto';
import { getDataSource } from '@kuraykaraaslan/db';
import { User as UserEntity } from '@kuraykaraaslan/user/server/entities/user.entity';
import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import MailAccountTemplatesService from '@kuraykaraaslan/notification_mail/server/notification_mail.account-templates.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AuditActions } from '@kuraykaraaslan/audit_log/server/audit_log.enums';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import { authEmailSubject } from './auth.i18n';
import type { AuthLocale } from './dictionaries';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

export default class AuthVerificationService {

  // GTH-3: env values are the fallback default; per-tenant email-verify TTL and
  // rate-limit are resolved at runtime via AuthPolicyService.getEmailVerifyPolicy.

  private static getEmailVerifyKey(userId: string): string {
    return `email:verify:${userId}`;
  }

  private static getEmailVerifyRateKey(userId: string): string {
    return `email:verify:rate:${userId}`;
  }

  static async logout({ accessToken }: { accessToken: string }): Promise<void> {}

  static async sendEmailVerification({ userId, email, name, tenantId, locale }: {
    userId: string; email: string; name?: string; tenantId?: string; locale?: AuthLocale;
  }): Promise<void> {
    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (user.emailVerifiedAt) throw new AppError(AuthMessages.EMAIL_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);

    const rateKey = AuthVerificationService.getEmailVerifyRateKey(userId);
    if (await redis.get(rateKey)) throw new AppError(AuthMessages.RATE_LIMIT_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);

    // GTH-3: per-tenant email-verification TTL + rate-limit window.
    const verifyPolicy = await AuthPolicyService.getEmailVerifyPolicy(tenantId);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const verifyKey = AuthVerificationService.getEmailVerifyKey(userId);
    await redis.set(verifyKey, hashedToken, 'EX', verifyPolicy.ttlSeconds);
    await redis.set(rateKey, '1', 'EX', verifyPolicy.rateLimitSeconds);

    // GTH-5: route verification mail through the request tenant's provider/branding.
    await MailAccountTemplatesService.sendVerifyEmail({ tenantId: tenantId ?? ROOT_TENANT_ID, email, name, verifyToken: rawToken, subject: authEmailSubject('verify_email', locale) });
    Logger.info(`Email verification sent for user ${userId}`);
  }

  static async verifyEmail({ userId, token }: { userId: string; token: string }): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (user.emailVerifiedAt) throw new AppError(AuthMessages.EMAIL_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);

    const verifyKey = AuthVerificationService.getEmailVerifyKey(userId);
    const storedHash = await redis.get(verifyKey);
    if (!storedHash) throw new AppError(AuthMessages.VERIFICATION_TOKEN_EXPIRED, 400, ErrorCode.VALIDATION_ERROR);

    const inputHash = crypto.createHash('sha256').update(token).digest('hex');
    if (inputHash !== storedHash) throw new AppError(AuthMessages.INVALID_VERIFICATION_TOKEN, 400, ErrorCode.VALIDATION_ERROR);

    await repo.update({ userId }, { emailVerifiedAt: new Date() });
    await redis.del(verifyKey);
    await redis.del(AuthVerificationService.getEmailVerifyRateKey(userId));

    AuditLogService.log({
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.AUTH_EMAIL_VERIFIED, metadata: { userId },
    }).catch(() => {});
    Logger.info(`Email verified for user ${userId}`);
  }
}
