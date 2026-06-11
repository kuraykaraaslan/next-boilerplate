import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import MailAccountTemplatesService from '../notification_mail/notification_mail.account-templates.service';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import AuthMessages from './auth.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class AuthVerificationService {

  private static readonly EMAIL_VERIFY_TTL_SECONDS = env.EMAIL_VERIFY_TTL_SECONDS ?? (60 * 60 * 24);
  private static readonly EMAIL_VERIFY_RATE_LIMIT_SECONDS = env.EMAIL_VERIFY_RATE_LIMIT_SECONDS ?? 300;

  private static getEmailVerifyKey(userId: string): string {
    return `email:verify:${userId}`;
  }

  private static getEmailVerifyRateKey(userId: string): string {
    return `email:verify:rate:${userId}`;
  }

  static async logout({ accessToken }: { accessToken: string }): Promise<void> {}

  static async sendEmailVerification({ userId, email, name, tenantId }: {
    userId: string; email: string; name?: string; tenantId?: string;
  }): Promise<void> {
    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (user.emailVerifiedAt) throw new AppError(AuthMessages.EMAIL_ALREADY_VERIFIED, 409, ErrorCode.CONFLICT);

    const rateKey = AuthVerificationService.getEmailVerifyRateKey(userId);
    if (await redis.get(rateKey)) throw new AppError(AuthMessages.RATE_LIMIT_EXCEEDED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const verifyKey = AuthVerificationService.getEmailVerifyKey(userId);
    await redis.set(verifyKey, hashedToken, 'EX', AuthVerificationService.EMAIL_VERIFY_TTL_SECONDS);
    await redis.set(rateKey, '1', 'EX', AuthVerificationService.EMAIL_VERIFY_RATE_LIMIT_SECONDS);

    await MailAccountTemplatesService.sendVerifyEmail({ tenantId: tenantId ?? ROOT_TENANT_ID, email, name, verifyToken: rawToken });
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
