import 'reflect-metadata';
import { getSystemDataSource } from '@/modules/db';
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
      const ds = await getSystemDataSource();
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
      const ds = await getSystemDataSource();
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
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new Error('Security record already exists for this user');

    const security = repo.create({ userId, otpMethods: [], otpBackupCodes: [], failedLoginAttempts: 0 });
    const saved = await repo.save(security);
    await this.clearCache(userId);
    return UserSecuritySchema.parse(saved);
  }

  static async updateUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new Error('Security record not found');

    await repo.update({ userId }, data as any);
    const updated = await repo.findOne({ where: { userId } });
    await this.clearCache(userId);
    return UserSecuritySchema.parse(updated!);
  }

  static async upsertUserSecurity(userId: string, data: Partial<UserSecurity>): Promise<UserSecurity> {
    const ds = await getSystemDataSource();
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

  static async recordLoginAttempt(userId: string, success: boolean, ip?: string, device?: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new Error('Security record not found');

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
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
      await repo.update({ userId }, { failedLoginAttempts: attempts, lockedUntil });
    }
    await this.clearCache(userId);
  }

  static async isLocked(userId: string): Promise<boolean> {
    const ds = await getSystemDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security || !security.lockedUntil) return false;
    return new Date() < security.lockedUntil;
  }
}
