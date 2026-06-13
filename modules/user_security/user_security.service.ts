import 'reflect-metadata';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { encryptFieldOpt, decryptFieldOpt, isEncryptedField } from '@/modules/common/field-encryption';
import SettingService from '@/modules/setting/setting.service';
import WebhookService from '@/modules/webhook/webhook.service';
import Logger from '@/modules/logger';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import { UserSecurity, UserSecuritySchema, SafeUserSecurity, SafeUserSecuritySchema, type TrustedDevice } from './user_security.types';
import UserSecurityMessages from './user_security.messages';

const USER_SECURITY_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

/** One-way hash for backup codes / device tokens — never store the raw value. */
function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Constant-time compare of two hex digests of equal length. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex')); } catch { return false; }
}

/** Decrypt the TOTP secret for return; the DB / cache only ever hold ciphertext. */
function hydrate(parsed: UserSecurity): UserSecurity {
  if (parsed.otpSecret) parsed.otpSecret = decryptFieldOpt(parsed.otpSecret) ?? null;
  return parsed;
}

export default class UserSecurityService {

  private static async clearCache(userId: string): Promise<void> {
    await Promise.all([
      redis.del(`user_security:user:${userId}`).catch(() => {}),
      redis.del(`user_security:safe:${userId}`).catch(() => {}),
    ]);
  }

  static async getByUserId(userId: string): Promise<UserSecurity> {
    const cacheKey = `user_security:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      // Cache holds the encrypted secret; decrypt only on the way out.
      try { return hydrate(UserSecuritySchema.parse(JSON.parse(cached))); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
      if (!security) return this.createDefaultUserSecurity(userId);

      const parsed = UserSecuritySchema.parse(security);
      await redis.setex(cacheKey, jitter(USER_SECURITY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return hydrate(parsed);
    });
  }

  static async getSafeByUserId(userId: string): Promise<SafeUserSecurity> {
    const cacheKey = `user_security:safe:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeUserSecuritySchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
      if (!security) {
        const created = await this.createDefaultUserSecurity(userId);
        return SafeUserSecuritySchema.parse(created);
      }
      const securityWithDefaults = {
        ...security,
        otpMethods: security.otpMethods ?? [],
        otpBackupCodes: security.otpBackupCodes ?? [],
      };
      const parsed = SafeUserSecuritySchema.parse(securityWithDefaults);
      await redis.setex(cacheKey, jitter(USER_SECURITY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async createDefaultUserSecurity(userId: string): Promise<UserSecurity> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new AppError(UserSecurityMessages.SECURITY_RECORD_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

    const security = repo.create({ userId, otpMethods: [], otpBackupCodes: [], failedLoginAttempts: 0 });
    const saved = await repo.save(security);
    await this.clearCache(userId);
    return UserSecuritySchema.parse(saved);
  }

  /** Encrypt the TOTP secret before it ever touches the DB (skip if already ciphertext). */
  private static encryptWrite<T extends Partial<UserSecurity>>(data: T): T {
    if (typeof data.otpSecret === 'string' && data.otpSecret && !isEncryptedField(data.otpSecret)) {
      return { ...data, otpSecret: encryptFieldOpt(data.otpSecret) };
    }
    return data;
  }

  static async updateUserSecurity(userId: string, dataIn: Partial<UserSecurity>): Promise<UserSecurity> {
    const data = this.encryptWrite(dataIn);
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await repo.update({ userId }, data as any);
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return hydrate(UserSecuritySchema.parse(updated!));
  }

  static async upsertUserSecurity(userId: string, dataIn: Partial<UserSecurity>): Promise<UserSecurity> {
    const data = this.encryptWrite(dataIn);
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      await repo.update({ userId }, data as any);
      const updated = await repo.findOne({ where: { userId } });
      await this.clearCache(userId);
      return hydrate(UserSecuritySchema.parse(updated!));
    }

    const security = repo.create({
      userId,
      ...data,
      otpMethods: data.otpMethods ?? [],
      otpBackupCodes: data.otpBackupCodes ?? [],
      failedLoginAttempts: data.failedLoginAttempts ?? 0,
    } as any);
    const saved = await repo.save(security);
    await this.clearCache(userId);
    return hydrate(UserSecuritySchema.parse(saved));
  }

  static async recordLoginAttempt(
    userId: string,
    success: boolean,
    ip?: string,
    device?: string,
    options?: { maxAttempts?: number; lockDurationMinutes?: number; tenantId?: string; country?: string },
  ): Promise<{ anomaly: boolean }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const maxAttempts = options?.maxAttempts ?? 5;
    const lockDurationMinutes = options?.lockDurationMinutes ?? 15;
    let anomaly = false;

    if (success) {
      // Anomaly: first login is never anomalous; afterwards a new IP or device is.
      anomaly = Boolean(security.lastLoginAt) && (
        (!!ip && !!security.lastLoginIp && ip !== security.lastLoginIp) ||
        (!!device && !!security.lastLoginDevice && device !== security.lastLoginDevice)
      );
      await repo.update({ userId }, {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: device,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
      if (anomaly && options?.tenantId) {
        WebhookService.dispatchEvent(options.tenantId, 'security.login_anomaly', {
          userId, ip: ip ?? null, device: device ?? null, country: options.country ?? null,
          previousIp: security.lastLoginIp ?? null, at: new Date().toISOString(),
        }).catch((err: unknown) => Logger.warn(`[user_security] anomaly webhook failed: ${err instanceof Error ? err.message : err}`));
      }
    } else {
      // Adaptive lockout: exponential backoff once the threshold is crossed.
      const attempts = security.failedLoginAttempts + 1;
      let lockedUntil: Date | undefined;
      if (attempts >= maxAttempts) {
        const over = attempts - maxAttempts;
        const minutes = Math.min(lockDurationMinutes * 2 ** over, 24 * 60); // cap at 24h
        lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
      }
      await repo.update({ userId }, { failedLoginAttempts: attempts, lockedUntil });
    }
    await this.clearCache(userId);
    return { anomaly };
  }

  static async isLocked(userId: string): Promise<boolean> {
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security || !security.lockedUntil) return false;
    return new Date() < security.lockedUntil;
  }

  /**
   * KD-7: Append a new password hash to the rotation history and trim to
   * the most-recent `historyCount` entries. Also stamps `passwordChangedAt`
   * and clears `mustChangePassword`. Callers must pass an already-hashed
   * value (bcrypt) — never plaintext.
   */
  static async pushPasswordHistory(userId: string, passwordHash: string, historyCount: number): Promise<void> {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(UserSecurityEntity);
      const security = await repo.findOne({ where: { userId } });
      if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const existing = Array.isArray(security.passwordHistory) ? (security.passwordHistory as string[]) : [];
      const next = [passwordHash, ...existing].slice(0, Math.max(0, historyCount));

      await repo.update({ userId }, {
        passwordHistory: next as any,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      });
    });
    await this.clearCache(userId);
  }

  static async getPasswordHistory(userId: string): Promise<string[]> {
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security) return [];
    return Array.isArray(security.passwordHistory) ? (security.passwordHistory as string[]) : [];
  }

  static async getPasswordChangedAt(userId: string): Promise<Date | null> {
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    return security?.passwordChangedAt ?? null;
  }

  static async setMustChangePassword(userId: string, value: boolean): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSecurityEntity).update({ userId }, { mustChangePassword: value });
    await this.clearCache(userId);
  }

  // ──────────────────────────────────────────────
  // Backup codes — stored as SHA-256 hashes, shown in plaintext only once
  // ──────────────────────────────────────────────

  /** Generate `count` single-use backup codes, persist their hashes, return the plaintext (once). */
  static async generateBackupCodes(userId: string, count = 10): Promise<string[]> {
    const plain = Array.from({ length: count }, () => randomBytes(5).toString('hex')); // 10 hex chars
    const hashes = plain.map(sha256);
    await this.updateUserSecurity(userId, { otpBackupCodes: hashes });
    return plain;
  }

  /** Verify a backup code in constant time; on success consume (remove) it. */
  static async verifyAndConsumeBackupCode(userId: string, code: string): Promise<boolean> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) return false;
    const stored = Array.isArray(security.otpBackupCodes) ? (security.otpBackupCodes as string[]) : [];
    const target = sha256(code.trim());
    const idx = stored.findIndex((h) => safeEqualHex(h, target));
    if (idx === -1) return false;
    stored.splice(idx, 1);
    await repo.update({ userId }, { otpBackupCodes: stored as any });
    await this.clearCache(userId);
    return true;
  }

  // ──────────────────────────────────────────────
  // Per-tenant MFA enforcement policy
  // ──────────────────────────────────────────────

  /**
   * Resolve the tenant's MFA policy from settings:
   * `mfaRequired` ('true'|'false') and `mfaRequiredRoles` (CSV of roles that
   * must use MFA regardless of the global flag).
   */
  static async getMfaPolicy(tenantId: string): Promise<{ required: boolean; requiredRoles: string[] }> {
    const s = await SettingService.getByKeys(tenantId, ['mfaRequired', 'mfaRequiredRoles']).catch(() => ({} as Record<string, string | null>));
    return {
      required: s.mfaRequired === 'true',
      requiredRoles: (s.mfaRequiredRoles ?? '').split(',').map((r) => r.trim()).filter(Boolean),
    };
  }

  /** Whether MFA must be enforced for a user with `role` in this tenant. */
  static async isMfaRequiredFor(tenantId: string, role?: string | null): Promise<boolean> {
    const policy = await this.getMfaPolicy(tenantId);
    if (policy.required) return true;
    return Boolean(role && policy.requiredRoles.includes(role));
  }

  /** True when the user has at least one active second factor configured. */
  static async hasMfaConfigured(userId: string): Promise<boolean> {
    const sec = await this.getSafeByUserId(userId);
    return (sec.otpMethods?.length ?? 0) > 0 || sec.passkeyEnabled === true;
  }

  /** Emit the MFA enable/disable security webhook (best-effort). */
  static async emitMfaChanged(tenantId: string, userId: string, enabled: boolean): Promise<void> {
    await WebhookService.dispatchEvent(tenantId, enabled ? 'security.mfa_enabled' : 'security.mfa_disabled', {
      userId, at: new Date().toISOString(),
    }).catch((err: unknown) => Logger.warn(`[user_security] mfa webhook failed: ${err instanceof Error ? err.message : err}`));
  }

  // ──────────────────────────────────────────────
  // Trusted devices (remember-this-device) — only token hashes are stored
  // ──────────────────────────────────────────────

  /**
   * Register a trusted device and return the opaque token to set as a secure,
   * httpOnly cookie. Only the SHA-256 hash of the token is persisted.
   */
  static async trustDevice(userId: string, label: string | null, ttlDays = 30): Promise<string> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + ttlDays * 86_400_000);
    const existing = (Array.isArray(security.trustedDevices) ? security.trustedDevices : []) as TrustedDevice[];
    const pruned = existing.filter((d) => new Date(d.expiresAt) > now);
    pruned.push({ idHash: sha256(token), label, createdAt: now.toISOString(), lastSeenAt: now.toISOString(), expiresAt: expires.toISOString() });
    await repo.update({ userId }, { trustedDevices: pruned as any });
    await this.clearCache(userId);
    return token;
  }

  /** True when the presented device token matches a non-expired trusted device. */
  static async isDeviceTrusted(userId: string, token: string | null | undefined): Promise<boolean> {
    if (!token) return false;
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security) return false;
    const target = sha256(token);
    const now = new Date();
    const devices = (Array.isArray(security.trustedDevices) ? security.trustedDevices : []) as TrustedDevice[];
    return devices.some((d) => new Date(d.expiresAt) > now && safeEqualHex(d.idHash, target));
  }

  /** Revoke all trusted devices for a user (e.g. on password change or logout-everywhere). */
  static async revokeTrustedDevices(userId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(UserSecurityEntity).update({ userId }, { trustedDevices: [] as any });
    await this.clearCache(userId);
  }
}
