import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import bcrypt from 'bcrypt';
import Logger from '@/modules/logger';
import UserService from '../user/user.service';
import TenantService from '../tenant/tenant.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import UserSecurityService from '../user_security/user_security.service';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import { SafeUser, SafeUserSchema } from '../user/user.types';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import CaptchaService from './auth.captcha.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class AuthCredentialService {

  static generateToken(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async login({ email, password, captchaToken, tenantId, ipAddress, userAgent }: {
    email: string;
    password: string;
    captchaToken?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: SafeUser; mustChangePassword: boolean }> {
    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (accessPolicy.captchaTriggerAttempts > 0
        && await CaptchaService.isRequired(email, accessPolicy.captchaTriggerAttempts)) {
      if (!captchaToken) throw new AppError(AuthMessages.CAPTCHA_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);
      const ok = await CaptchaService.verify(captchaToken);
      if (!ok) throw new AppError(AuthMessages.CAPTCHA_INVALID, 400, ErrorCode.VALIDATION_ERROR);
    }

    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      AuditLogService.log({
        tenantId: tenantId ?? null, actorType: 'SYSTEM', action: AuditActions.AUTH_LOGIN_FAILED,
        metadata: { email: email.toLowerCase(), reason: 'USER_NOT_FOUND' }, ipAddress, userAgent,
      }).catch(() => {});
      await CaptchaService.recordFailure(email).catch(() => {});
      throw new AppError(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS);
    }

    if (user.userStatus !== 'ACTIVE') {
      AuditLogService.log({
        tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
        action: AuditActions.AUTH_ACCOUNT_DISABLED, metadata: { reason: user.userStatus }, ipAddress, userAgent,
      }).catch(() => {});
      throw new AppError(AuthMessages.ACCOUNT_DISABLED, 403, ErrorCode.FORBIDDEN);
    }

    if (await UserSecurityService.isLocked(user.userId)) {
      AuditLogService.log({
        tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
        action: AuditActions.AUTH_ACCOUNT_LOCKED, ipAddress, userAgent,
      }).catch(() => {});
      throw new AppError(AuthMessages.ACCOUNT_LOCKED, 403, ErrorCode.FORBIDDEN);
    }

    const lockoutPolicy = await AuthPolicyService.getLockoutPolicy(tenantId);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await UserSecurityService.recordLoginAttempt(user.userId, false, ipAddress, userAgent, {
        maxAttempts: lockoutPolicy.maxAttempts, lockDurationMinutes: lockoutPolicy.lockDurationMinutes,
      }).catch((err: unknown) => {
        Logger.warn(`AuthCredentialService.login: failed to record bad attempt: ${err instanceof Error ? err.message : String(err)}`);
      });
      AuditLogService.log({
        tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
        action: AuditActions.AUTH_LOGIN_FAILED, metadata: { reason: 'BAD_PASSWORD' }, ipAddress, userAgent,
      }).catch(() => {});
      await CaptchaService.recordFailure(email).catch(() => {});
      throw new AppError(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS);
    }

    const passwordPolicy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const changedAt = await UserSecurityService.getPasswordChangedAt(user.userId);
    let mustChangePassword = false;
    if (passwordPolicy.maxAgeDays > 0 && changedAt) {
      const ageMs = Date.now() - changedAt.getTime();
      if (ageMs > passwordPolicy.maxAgeDays * 24 * 60 * 60 * 1000) mustChangePassword = true;
    }

    if (accessPolicy.externalRequireMfa) {
      const sec = await UserSecurityService.getSafeByUserId(user.userId).catch(() => null);
      if (!sec || (sec.otpMethods?.length ?? 0) === 0) {
        AuditLogService.log({
          tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
          action: AuditActions.AUTH_LOGIN_FAILED, metadata: { reason: 'MFA_ENROLLMENT_REQUIRED' }, ipAddress, userAgent,
        }).catch(() => {});
        throw new AppError(AuthMessages.MFA_ENROLLMENT_REQUIRED, 403, ErrorCode.FORBIDDEN);
      }
    }

    await UserSecurityService.recordLoginAttempt(user.userId, true, ipAddress, userAgent, {
      maxAttempts: lockoutPolicy.maxAttempts, lockDurationMinutes: lockoutPolicy.lockDurationMinutes,
    }).catch((err: unknown) => {
      Logger.warn(`AuthCredentialService.login: failed to record success: ${err instanceof Error ? err.message : String(err)}`);
    });
    await CaptchaService.clear(email).catch(() => {});

    AuditLogService.log({
      tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
      action: AuditActions.AUTH_LOGIN, metadata: { mustChangePassword }, ipAddress, userAgent,
    }).catch(() => {});

    return { user: SafeUserSchema.parse(user), mustChangePassword };
  }

  static async register({ email, password, phone, tenantId, consentVersion }: {
    email: string; password: string; phone?: string; tenantId?: string; consentVersion?: string;
  }): Promise<{ user: SafeUser }> {
    const existingUser = await UserService.getByEmail(email);
    if (existingUser) throw new AppError(AuthMessages.EMAIL_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(password, policy, { email });
    if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

    const ds = await getDataSource();
    const hashed = await AuthCredentialService.hashPassword(password);
    const parsedUser = await ds.transaction(async (manager) => {
      const now = new Date();
      const newUser = manager.getRepository(UserEntity).create({
        phone,
        email: email.toLowerCase(),
        password: hashed,
        ...(consentVersion ? { consentVersion, consentAcceptedAt: now } : {}),
      });
      const saved = await manager.getRepository(UserEntity).save(newUser);
      return SafeUserSchema.parse(saved);
    });

    await UserSecurityService.pushPasswordHistory(parsedUser.userId, hashed, policy.historyCount).catch(
      (err: unknown) => Logger.warn(`AuthCredentialService.register: seed history failed: ${err instanceof Error ? err.message : String(err)}`),
    );
    await TenantService.provisionPersonal(parsedUser.userId, parsedUser.email);
    await TenantInvitationService.autoAcceptForEmail(parsedUser.userId, parsedUser.email);
    return { user: parsedUser };
  }

  static async changePassword({ userId, newPassword, tenantId }: {
    userId: string; newPassword: string; tenantId?: string;
  }): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(newPassword, policy, { email: user.email });
    if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

    const history = await UserSecurityService.getPasswordHistory(userId);
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);
    }
    if (await bcrypt.compare(newPassword, user.password)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);

    const newHash = await AuthCredentialService.hashPassword(newPassword);
    await ds.transaction(async (manager) => {
      await manager.getRepository(UserEntity).update({ userId }, { password: newHash });
      await UserSecurityService.pushPasswordHistory(userId, newHash, policy.historyCount);
    });
    await UserService.invalidate({ userId, email: user.email });
    AuditLogService.log({
      tenantId: tenantId ?? null, actorId: userId, actorType: 'USER',
      action: AuditActions.AUTH_PASSWORD_CHANGED, metadata: { userId },
    }).catch(() => {});
  }

  /**
   * GDPR Art. 17 / CCPA / KVKK right-to-erasure.
   * Anonymises all PII fields while preserving the row for FK integrity.
   * Clears all active sessions and security data after anonymisation.
   */
  static async eraseUserData(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new AppError(AuthMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const anonymisedEmail = `erased-${userId}@erased.invalid`;
    await ds.transaction(async (manager) => {
      await manager.getRepository(UserEntity).update({ userId }, {
        email: anonymisedEmail,
        phone: undefined,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        userStatus: 'INACTIVE',
        emailVerifiedAt: undefined,
        consentVersion: undefined,
        consentAcceptedAt: undefined,
      });
    });

    await UserService.invalidate({ userId, email: user.email });

    AuditLogService.log({
      tenantId: null, actorId: userId, actorType: 'USER',
      action: AuditActions.AUTH_DORMANT_DISABLED,
      metadata: { reason: 'GDPR_ERASURE', userId },
    }).catch(() => {});

    Logger.info(`AuthCredentialService.eraseUserData: PII erased for user ${userId}`);
  }

  static checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'];
    return roles.indexOf(user.userRole) <= roles.indexOf(requiredRole);
  }

  static async disableDormantAccounts(tenantId?: string): Promise<{ scanned: number; disabled: number }> {
    const policy = await AuthPolicyService.getDormantPolicy(tenantId);
    if (policy.days <= 0) return { scanned: 0, disabled: 0 };

    const cutoff = new Date(Date.now() - policy.days * 24 * 60 * 60 * 1000);
    const ds = await getDataSource();
    const dormantRows: { userId: string }[] = await ds.query(
      `SELECT u."userId" FROM users u
       LEFT JOIN user_securities s ON s."userId" = u."userId"
       WHERE u."userStatus" = 'ACTIVE'
         AND COALESCE(s."lastLoginAt", u."createdAt") < $1`,
      [cutoff],
    );

    if (!policy.autoDisable || dormantRows.length === 0) {
      return { scanned: dormantRows.length, disabled: 0 };
    }

    const ids = dormantRows.map((r) => r.userId);
    const repo = ds.getRepository(UserEntity);
    await repo.createQueryBuilder().update(UserEntity).set({ userStatus: 'INACTIVE' }).whereInIds(ids).execute();
    for (const id of ids) await UserService.invalidate({ userId: id }).catch(() => {});

    AuditLogService.log({
      tenantId: tenantId ?? null, actorType: 'SYSTEM', action: AuditActions.AUTH_DORMANT_DISABLED,
      metadata: { disabled: ids.length, scanned: dormantRows.length, thresholdDays: policy.days },
    }).catch(() => {});

    Logger.info(`AuthCredentialService.disableDormantAccounts: disabled ${ids.length} dormant accounts (>${policy.days}d)`);
    return { scanned: dormantRows.length, disabled: ids.length };
  }
}
