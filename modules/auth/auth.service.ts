import 'reflect-metadata';
import { env } from '@/modules/env';
import crypto from 'crypto';
import { getSystemDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import bcrypt from 'bcrypt';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import UserService from '../user/user.service';
import TenantService from '../tenant/tenant.service';
import TenantInvitationService from '../tenant_invitation/tenant_invitation.service';
import MailService from '../notification_mail/notification_mail.service';
import UserSecurityService from '../user_security/user_security.service';
import AuditLogService from '../audit_log/audit_log.service';
import { AuditActions } from '../audit_log/audit_log.enums';
import { SafeUser, SafeUserSchema } from '../user/user.types';
import AuthMessages from './auth.messages';
import AuthPolicyService from './auth.policy.service';
import CaptchaService from './auth.captcha.service';

export default class AuthService {

  static generateToken(): string {
    // Crypto-safe replacement for Math.random — KD-3
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
    // KD-19: if recent failures crossed the threshold, demand & verify a captcha
    // BEFORE touching bcrypt or auditing — avoids both wasted compute and noise.
    const accessPolicy = await AuthPolicyService.getAccessPolicy(tenantId);
    if (accessPolicy.captchaTriggerAttempts > 0
        && await CaptchaService.isRequired(email, accessPolicy.captchaTriggerAttempts)) {
      if (!captchaToken) throw new Error(AuthMessages.CAPTCHA_REQUIRED);
      const ok = await CaptchaService.verify(captchaToken);
      if (!ok) throw new Error(AuthMessages.CAPTCHA_INVALID);
    }

    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      // KD-14: log failed attempt for unknown identities too — actorId stays null.
      AuditLogService.log({
        tenantId: tenantId ?? null,
        actorType: 'SYSTEM',
        action: AuditActions.AUTH_LOGIN_FAILED,
        metadata: { email: email.toLowerCase(), reason: 'USER_NOT_FOUND' },
        ipAddress, userAgent,
      }).catch(() => {});
      // Treat unknown-identity failures as captcha failures too — otherwise an
      // attacker probing usernames bypasses the threshold.
      await CaptchaService.recordFailure(email).catch(() => {});
      throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
    }

    // KD-15 / KD-10: deny dormant/suspended accounts with a generic message
    // so we don't leak which accounts are alive.
    if (user.userStatus !== 'ACTIVE') {
      AuditLogService.log({
        tenantId: tenantId ?? null,
        actorId: user.userId,
        actorType: 'USER',
        action: AuditActions.AUTH_ACCOUNT_DISABLED,
        metadata: { reason: user.userStatus },
        ipAddress, userAgent,
      }).catch(() => {});
      throw new Error(AuthMessages.ACCOUNT_DISABLED);
    }

    // KD-9: lockout enforcement — short-circuit before bcrypt to avoid timing oracle.
    if (await UserSecurityService.isLocked(user.userId)) {
      AuditLogService.log({
        tenantId: tenantId ?? null,
        actorId: user.userId,
        actorType: 'USER',
        action: AuditActions.AUTH_ACCOUNT_LOCKED,
        ipAddress, userAgent,
      }).catch(() => {});
      throw new Error(AuthMessages.ACCOUNT_LOCKED);
    }

    const lockoutPolicy = await AuthPolicyService.getLockoutPolicy(tenantId);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await UserSecurityService.recordLoginAttempt(user.userId, false, ipAddress, userAgent, {
        maxAttempts: lockoutPolicy.maxAttempts,
        lockDurationMinutes: lockoutPolicy.lockDurationMinutes,
      }).catch((err: unknown) => {
        Logger.warn(`AuthService.login: failed to record bad attempt: ${err instanceof Error ? err.message : String(err)}`);
      });
      AuditLogService.log({
        tenantId: tenantId ?? null,
        actorId: user.userId,
        actorType: 'USER',
        action: AuditActions.AUTH_LOGIN_FAILED,
        metadata: { reason: 'BAD_PASSWORD' },
        ipAddress, userAgent,
      }).catch(() => {});
      await CaptchaService.recordFailure(email).catch(() => {});
      throw new Error(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
    }

    // KD-7: password age check — reject if older than maxAgeDays (0 disables).
    const passwordPolicy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const changedAt = await UserSecurityService.getPasswordChangedAt(user.userId);
    let mustChangePassword = false;
    if (passwordPolicy.maxAgeDays > 0 && changedAt) {
      const ageMs = Date.now() - changedAt.getTime();
      if (ageMs > passwordPolicy.maxAgeDays * 24 * 60 * 60 * 1000) {
        mustChangePassword = true;
      }
    }

    // KD-16: when externalRequireMfa is set, block users without any enrolled
    // MFA method. The frontend should redirect them to enrol — we don't enrol
    // here on their behalf because that would defeat the purpose.
    if (accessPolicy.externalRequireMfa) {
      const sec = await UserSecurityService.getSafeByUserId(user.userId).catch(() => null);
      if (!sec || (sec.otpMethods?.length ?? 0) === 0) {
        AuditLogService.log({
          tenantId: tenantId ?? null,
          actorId: user.userId,
          actorType: 'USER',
          action: AuditActions.AUTH_LOGIN_FAILED,
          metadata: { reason: 'MFA_ENROLLMENT_REQUIRED' },
          ipAddress, userAgent,
        }).catch(() => {});
        throw new Error(AuthMessages.MFA_ENROLLMENT_REQUIRED);
      }
    }

    await UserSecurityService.recordLoginAttempt(user.userId, true, ipAddress, userAgent, {
      maxAttempts: lockoutPolicy.maxAttempts,
      lockDurationMinutes: lockoutPolicy.lockDurationMinutes,
    }).catch((err: unknown) => {
      Logger.warn(`AuthService.login: failed to record success: ${err instanceof Error ? err.message : String(err)}`);
    });
    await CaptchaService.clear(email).catch(() => {});

    AuditLogService.log({
      tenantId: tenantId ?? null,
      actorId: user.userId,
      actorType: 'USER',
      action: AuditActions.AUTH_LOGIN,
      metadata: { mustChangePassword },
      ipAddress, userAgent,
    }).catch(() => {});

    return { user: SafeUserSchema.parse(user), mustChangePassword };
  }

  static async logout({ accessToken }: { accessToken: string }): Promise<void> {}

  static async register({ email, password, phone, tenantId }: { email: string; password: string; phone?: string; tenantId?: string }): Promise<{ user: SafeUser }> {
    const existingUser = await UserService.getByEmail(email);
    if (existingUser) throw new Error(AuthMessages.EMAIL_ALREADY_EXISTS);

    // KD-5: enforce password policy at registration.
    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(password, policy, { email });
    if (policyError) throw new Error(policyError);

    const ds = await getSystemDataSource();
    const hashed = await AuthService.hashPassword(password);
    const newUser = ds.getRepository(UserEntity).create({
      phone,
      email: email.toLowerCase(),
      password: hashed,
    });
    const saved = await ds.getRepository(UserEntity).save(newUser);
    const parsedUser = SafeUserSchema.parse(saved);

    // KD-7: seed password history so the very next change can't reuse this hash.
    await UserSecurityService.pushPasswordHistory(parsedUser.userId, hashed, policy.historyCount).catch(
      (err: unknown) => Logger.warn(`AuthService.register: seed history failed: ${err instanceof Error ? err.message : String(err)}`),
    );

    await TenantService.provisionPersonal(parsedUser.userId, parsedUser.email);
    await TenantInvitationService.autoAcceptForEmail(parsedUser.userId, parsedUser.email);

    return { user: parsedUser };
  }

  /**
   * Change the user's password. Enforces KD-5 (complexity) and KD-7 (no reuse).
   * Caller is expected to already have verified the current password (e.g. via session + currentPassword check) — this method only mutates.
   */
  static async changePassword({ userId, newPassword, tenantId }: { userId: string; newPassword: string; tenantId?: string }): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);

    const policy = await AuthPolicyService.getPasswordPolicy(tenantId);
    const policyError = AuthPolicyService.validatePassword(newPassword, policy, { email: user.email });
    if (policyError) throw new Error(policyError);

    // KD-7: reject reuse of any password whose hash is in the rotation history.
    const history = await UserSecurityService.getPasswordHistory(userId);
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        throw new Error(AuthMessages.PASSWORD_REUSED);
      }
    }
    // Also reject reuse of the current password.
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new Error(AuthMessages.PASSWORD_REUSED);
    }

    const newHash = await AuthService.hashPassword(newPassword);
    await repo.update({ userId }, { password: newHash });
    await UserSecurityService.pushPasswordHistory(userId, newHash, policy.historyCount);
    await UserService.invalidate({ userId, email: user.email });
  }

  private static readonly EMAIL_VERIFY_TTL_SECONDS = env.EMAIL_VERIFY_TTL_SECONDS ?? (60 * 60 * 24);
  private static readonly EMAIL_VERIFY_RATE_LIMIT_SECONDS = env.EMAIL_VERIFY_RATE_LIMIT_SECONDS ?? 300;

  private static getEmailVerifyKey(userId: string): string {
    return `email:verify:${userId}`;
  }

  private static getEmailVerifyRateKey(userId: string): string {
    return `email:verify:rate:${userId}`;
  }

  static async sendEmailVerification({ userId, email, name }: { userId: string; email: string; name?: string }): Promise<void> {
    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
    if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

    const rateKey = AuthService.getEmailVerifyRateKey(userId);
    if (await redis.get(rateKey)) throw new Error(AuthMessages.RATE_LIMIT_EXCEEDED);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const verifyKey = AuthService.getEmailVerifyKey(userId);
    await redis.set(verifyKey, hashedToken, 'EX', AuthService.EMAIL_VERIFY_TTL_SECONDS);
    await redis.set(rateKey, '1', 'EX', AuthService.EMAIL_VERIFY_RATE_LIMIT_SECONDS);

    await MailService.sendVerifyEmail({ email, name, verifyToken: rawToken });
    Logger.info(`Email verification sent for user ${userId}`);
  }

  static async verifyEmail({ userId, token }: { userId: string; token: string }): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new Error(AuthMessages.USER_NOT_FOUND);
    if (user.emailVerifiedAt) throw new Error(AuthMessages.EMAIL_ALREADY_VERIFIED);

    const verifyKey = AuthService.getEmailVerifyKey(userId);
    const storedHash = await redis.get(verifyKey);
    if (!storedHash) throw new Error(AuthMessages.VERIFICATION_TOKEN_EXPIRED);

    const inputHash = crypto.createHash('sha256').update(token).digest('hex');
    if (inputHash !== storedHash) throw new Error(AuthMessages.INVALID_VERIFICATION_TOKEN);

    await repo.update({ userId }, { emailVerifiedAt: new Date() });
    await redis.del(verifyKey);
    await redis.del(AuthService.getEmailVerifyRateKey(userId));

    Logger.info(`Email verified for user ${userId}`);
  }

  public static checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'];
    return roles.indexOf(user.userRole) <= roles.indexOf(requiredRole);
  }

  /**
   * KD-15: Sweep accounts whose last successful login is older than the
   * configured dormant threshold and move them to INACTIVE. When the policy
   * has `autoDisable=false`, this becomes a dry-run useful for reporting.
   *
   * - "Last activity" is taken from `user_securities.lastLoginAt`; if a user
   *   has no security row, their `users.createdAt` is used as the baseline.
   * - Only ACTIVE accounts are touched. Admin-suspended accounts stay as-is.
   */
  static async disableDormantAccounts(tenantId?: string): Promise<{ scanned: number; disabled: number }> {
    const policy = await AuthPolicyService.getDormantPolicy(tenantId);
    if (policy.days <= 0) return { scanned: 0, disabled: 0 };

    const cutoff = new Date(Date.now() - policy.days * 24 * 60 * 60 * 1000);

    const ds = await getSystemDataSource();
    // Inline-join through TypeORM raw query to avoid pulling user_security entity here.
    const dormantRows: { userId: string }[] = await ds.query(
      `
      SELECT u."userId"
      FROM users u
      LEFT JOIN user_securities s ON s."userId" = u."userId"
      WHERE u."userStatus" = 'ACTIVE'
        AND COALESCE(s."lastLoginAt", u."createdAt") < $1
      `,
      [cutoff],
    );

    if (!policy.autoDisable || dormantRows.length === 0) {
      return { scanned: dormantRows.length, disabled: 0 };
    }

    const ids = dormantRows.map((r) => r.userId);
    const repo = ds.getRepository(UserEntity);
    await repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ userStatus: 'INACTIVE' })
      .whereInIds(ids)
      .execute();

    for (const id of ids) {
      await UserService.invalidate({ userId: id }).catch(() => {});
    }

    Logger.info(`AuthService.disableDormantAccounts: disabled ${ids.length} dormant accounts (>${policy.days}d)`);
    return { scanned: dormantRows.length, disabled: ids.length };
  }
}
