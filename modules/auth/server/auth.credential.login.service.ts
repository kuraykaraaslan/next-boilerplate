import 'reflect-metadata';
import { getDataSource } from '@kuraykaraaslan/db';
import { User as UserEntity } from '@kuraykaraaslan/user/server/entities/user.entity';
import bcrypt from 'bcrypt';
import Logger from '@kuraykaraaslan/logger';
import UserSecurityService from '@kuraykaraaslan/user_security/server/user_security.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AuditActions } from '@kuraykaraaslan/audit_log/server/audit_log.enums';
import { SafeUser, SafeUserSchema } from '@kuraykaraaslan/user/server/user.types';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import CaptchaService from './auth.captcha.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { recordLoginFailureMetric, emitAccountLockedEvent } from './auth.credential.helpers';

export async function login({ email, password, captchaToken, tenantId, ipAddress, userAgent }: {
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
    recordLoginFailureMetric(tenantId, 'USER_NOT_FOUND');
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
    recordLoginFailureMetric(tenantId, 'ACCOUNT_LOCKED');
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
    recordLoginFailureMetric(tenantId, 'BAD_PASSWORD');
    await CaptchaService.recordFailure(email).catch(() => {});

    // GTH-18: when this bad attempt crossed the lockout threshold, notify the
    // tenant's security webhooks. Best-effort — never blocks the login path.
    if (await UserSecurityService.isLocked(user.userId).catch(() => false)) {
      emitAccountLockedEvent({
        tenantId, userId: user.userId, email: user.email,
        maxAttempts: lockoutPolicy.maxAttempts,
        lockDurationMinutes: lockoutPolicy.lockDurationMinutes,
        ipAddress, userAgent,
      });
    }
    throw new AppError(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS);
  }

  // GTH-1 / GTH-12: when the tenant requires a verified email, block login
  // until the user has confirmed their address.
  if (accessPolicy.emailVerificationRequired && !user.emailVerifiedAt) {
    AuditLogService.log({
      tenantId: tenantId ?? null, actorId: user.userId, actorType: 'USER',
      action: AuditActions.AUTH_LOGIN_FAILED, metadata: { reason: 'EMAIL_VERIFICATION_REQUIRED' }, ipAddress, userAgent,
    }).catch(() => {});
    recordLoginFailureMetric(tenantId, 'EMAIL_VERIFICATION_REQUIRED');
    throw new AppError(AuthMessages.EMAIL_VERIFICATION_REQUIRED, 403, ErrorCode.FORBIDDEN);
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
      recordLoginFailureMetric(tenantId, 'MFA_ENROLLMENT_REQUIRED');
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
