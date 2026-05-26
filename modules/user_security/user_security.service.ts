import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import { UserSecurity, UserSecuritySchema, SafeUserSecurity, SafeUserSecuritySchema } from './user_security.types';

const USER_SECURITY_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

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
      try { return UserSecuritySchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
      if (!security) return this.createDefaultUserSecurity(userId);

      const parsed = UserSecuritySchema.parse(security);
      await redis.setex(cacheKey, jitter(USER_SECURITY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
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
    if (existing) throw new Error('Security record already exists for this user');

    const security = repo.create({ userId, otpMethods: [], otpBackupCodes: [], failedLoginAttempts: 0 });
    const saved = await repo.save(security);
    await this.clearCache(userId);
    return UserSecuritySchema.parse(saved);
  }

  static async updateUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new Error('Security record not found');

    await repo.update({ userId }, data as any);
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserSecuritySchema.parse(updated!);
  }

  static async upsertUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      await repo.update({ userId }, data as any);
      const updated = await repo.findOne({ where: { userId } });
      await this.clearCache(userId);
      return UserSecuritySchema.parse(updated!);
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
    return UserSecuritySchema.parse(saved);
  }

  static async recordLoginAttempt(
    userId: string,
    success: boolean,
    ip?: string,
    device?: string,
    options?: { maxAttempts?: number; lockDurationMinutes?: number },
  ): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new Error('Security record not found');

    const maxAttempts = options?.maxAttempts ?? 5;
    const lockDurationMinutes = options?.lockDurationMinutes ?? 15;

    if (success) {
      await repo.update({ userId }, {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: device,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
    } else {
      const attempts = security.failedLoginAttempts + 1;
      const lockedUntil = attempts >= maxAttempts
        ? new Date(Date.now() + lockDurationMinutes * 60 * 1000)
        : undefined;
      await repo.update({ userId }, { failedLoginAttempts: attempts, lockedUntil });
    }
    await this.clearCache(userId);
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
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new Error('Security record not found');

    const existing = Array.isArray(security.passwordHistory) ? (security.passwordHistory as string[]) : [];
    const next = [passwordHash, ...existing].slice(0, Math.max(0, historyCount));

    await repo.update({ userId }, {
      passwordHistory: next as any,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
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
}
