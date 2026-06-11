import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import { UserConsent as UserConsentEntity } from './entities/user_consent.entity';
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
import ObservabilityService from '@/modules/observability';
import WebhookService from '@/modules/webhook/webhook.service';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class AuthCredentialService {

  static generateToken(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * GTH-6: bcrypt cost is per-tenant (`bcryptCost`, validated 4..15), falling
   * back to the historical default of 10. Pass `tenantId` to honour the tenant
   * tier; without it the default is used.
   */
  static async hashPassword(password: string, tenantId?: string): Promise<string> {
    const { bcryptCost } = await AuthPolicyService.getCredentialPolicy(tenantId);
    return bcrypt.hash(password, bcryptCost);
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
      AuthCredentialService.recordLoginFailureMetric(tenantId, 'USER_NOT_FOUND');
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
      AuthCredentialService.recordLoginFailureMetric(tenantId, 'ACCOUNT_LOCKED');
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
      AuthCredentialService.recordLoginFailureMetric(tenantId, 'BAD_PASSWORD');
      await CaptchaService.recordFailure(email).catch(() => {});

      // GTH-18: when this bad attempt crossed the lockout threshold, notify the
      // tenant's security webhooks. Best-effort — never blocks the login path.
      if (await UserSecurityService.isLocked(user.userId).catch(() => false)) {
        AuthCredentialService.emitAccountLockedEvent({
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
      AuthCredentialService.recordLoginFailureMetric(tenantId, 'EMAIL_VERIFICATION_REQUIRED');
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
        AuthCredentialService.recordLoginFailureMetric(tenantId, 'MFA_ENROLLMENT_REQUIRED');
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
    // GTH-1 / GTH-12: honour the tenant's self-registration posture. Invite-only
    // tenants set `allowRegistration=false`; the only path in is an invitation.
    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (!accessPolicy.allowRegistration) {
      throw new AppError(AuthMessages.REGISTRATION_DISABLED, 403, ErrorCode.FORBIDDEN);
    }

    const existingUser = await UserService.getByEmail(email);
    if (existingUser) throw new AppError(AuthMessages.EMAIL_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(password, policy, { email });
    if (policyError) throw new AppError(policyError, 422, ErrorCode.VALIDATION_ERROR);

    const ds = await getDataSource();
    const hashed = await AuthCredentialService.hashPassword(password, tenantId);
    const parsedUser = await ds.transaction(async (manager) => {
      const now = new Date();
      const newUser = manager.getRepository(UserEntity).create({
        phone,
        email: email.toLowerCase(),
        password: hashed,
        ...(consentVersion ? { consentVersion, consentAcceptedAt: now } : {}),
      });
      const saved = await manager.getRepository(UserEntity).save(newUser);
      // GTH-7: persist a verifiable, versioned consent record (GDPR Art. 7 /
      // KVKK / LGPD). Append-only — one row per consent event.
      if (consentVersion) {
        await manager.getRepository(UserConsentEntity).save(
          manager.getRepository(UserConsentEntity).create({
            userId: saved.userId,
            tenantId: tenantId ?? null,
            documentType: 'terms_of_service',
            documentVersion: consentVersion,
          }),
        );
      }
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

    // GTH-9: minimum password age — block changing the password again until it
    // has aged `minAgeDays` (prevents history-cycling to revert to a banned one).
    if (policy.minAgeDays > 0) {
      const changedAt = await UserSecurityService.getPasswordChangedAt(userId).catch(() => null);
      if (changedAt) {
        const ageMs = Date.now() - changedAt.getTime();
        if (ageMs < policy.minAgeDays * 24 * 60 * 60 * 1000) {
          throw new AppError(AuthMessages.PASSWORD_CHANGED_TOO_RECENTLY, 422, ErrorCode.VALIDATION_ERROR);
        }
      }
    }

    const history = await UserSecurityService.getPasswordHistory(userId);
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);
    }
    if (await bcrypt.compare(newPassword, user.password)) throw new AppError(AuthMessages.PASSWORD_REUSED, 422, ErrorCode.VALIDATION_ERROR);

    const newHash = await AuthCredentialService.hashPassword(newPassword, tenantId);
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

  static async disableDormantAccounts(tenantId?: string): Promise<{ scanned: number; disabled: number; erased: number }> {
    const policy = await AuthPolicyService.getDormantPolicy(tenantId);
    if (policy.days <= 0) return { scanned: 0, disabled: 0, erased: 0 };

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
      return { scanned: dormantRows.length, disabled: 0, erased: 0 };
    }

    const ids = dormantRows.map((r) => r.userId);
    const repo = ds.getRepository(UserEntity);
    await repo.createQueryBuilder().update(UserEntity).set({ userStatus: 'INACTIVE' }).whereInIds(ids).execute();
    for (const id of ids) await UserService.invalidate({ userId: id }).catch(() => {});

    AuditLogService.log({
      tenantId: tenantId ?? null, actorType: 'SYSTEM', action: AuditActions.AUTH_DORMANT_DISABLED,
      metadata: { disabled: ids.length, scanned: dormantRows.length, thresholdDays: policy.days },
    }).catch(() => {});

    // GTH-8: right-to-erasure window. Accounts that have been dormant for longer
    // than `dormantDeleteAfterDays` (and >= the disable threshold) get their PII
    // anonymised rather than merely disabled. 0 = never erase (disable-only).
    let erased = 0;
    if (policy.deleteAfterDays > 0) {
      const eraseCutoff = new Date(Date.now() - policy.deleteAfterDays * 24 * 60 * 60 * 1000);
      const eraseRows: { userId: string }[] = await ds.query(
        `SELECT u."userId" FROM users u
         LEFT JOIN user_securities s ON s."userId" = u."userId"
         WHERE u."email" NOT LIKE 'erased-%@erased.invalid'
           AND COALESCE(s."lastLoginAt", u."createdAt") < $1`,
        [eraseCutoff],
      );
      for (const row of eraseRows) {
        await AuthCredentialService.eraseUserData(row.userId).then(() => { erased += 1; }).catch((err: unknown) => {
          Logger.warn(`AuthCredentialService.disableDormantAccounts: erase failed for ${row.userId}: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    }

    Logger.info(`AuthCredentialService.disableDormantAccounts: disabled ${ids.length} dormant accounts (>${policy.days}d), erased ${erased} (>${policy.deleteAfterDays}d)`);
    return { scanned: dormantRows.length, disabled: ids.length, erased };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GTH-17 / GTH-18: observability + lockout webhook helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** GTH-17: per-tenant login-failure counter on the Prometheus registry. */
  private static recordLoginFailureMetric(tenantId: string | undefined, reason: string): void {
    try {
      ObservabilityService.recordTenantUsage({
        tenantId: tenantId ?? ROOT_TENANT_ID,
        metric: `auth_login_failure:${reason}`,
        value: 1,
      });
    } catch (err: unknown) {
      Logger.warn(`AuthCredentialService: login-failure metric emit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** GTH-18: fire the (already-registered) `auth.account_locked` tenant webhook. */
  private static emitAccountLockedEvent(args: {
    tenantId?: string; userId: string; email: string;
    maxAttempts: number; lockDurationMinutes: number;
    ipAddress?: string; userAgent?: string;
  }): void {
    WebhookService.dispatchEvent(args.tenantId ?? ROOT_TENANT_ID, 'auth.account_locked', {
      userId: args.userId,
      email: args.email,
      maxAttempts: args.maxAttempts,
      lockDurationMinutes: args.lockDurationMinutes,
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
      lockedAt: new Date().toISOString(),
    }).catch((err: unknown) => {
      Logger.warn(`AuthCredentialService: account_locked webhook dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
