import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import redis, { jitter, singleFlight } from '@nb/redis';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import { UserSecurity, UserSecuritySchema, SafeUserSecurity, SafeUserSecuritySchema } from './user_security.types';
import UserSecurityMessages from './user_security.messages';
import { USER_SECURITY_CACHE_TTL, hydrate, encryptWrite, clearCache } from './user_security.helpers';

export async function getByUserId(userId: string): Promise<UserSecurity> {
  const cacheKey = `user_security:user:${userId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    // Cache holds the encrypted secret; decrypt only on the way out.
    try { return hydrate(UserSecuritySchema.parse(JSON.parse(cached))); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security) return createDefaultUserSecurity(userId);

    const parsed = UserSecuritySchema.parse(security);
    await redis.setex(cacheKey, jitter(USER_SECURITY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return hydrate(parsed);
  });
}

export async function getSafeByUserId(userId: string): Promise<SafeUserSecurity> {
  const cacheKey = `user_security:safe:${userId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try { return SafeUserSecuritySchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await getDataSource();
    const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
    if (!security) {
      const created = await createDefaultUserSecurity(userId);
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

export async function createDefaultUserSecurity(userId: string): Promise<UserSecurity> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const existing = await repo.findOne({ where: { userId } });
  if (existing) throw new AppError(UserSecurityMessages.SECURITY_RECORD_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

  const security = repo.create({ userId, otpMethods: [], otpBackupCodes: [], failedLoginAttempts: 0 });
  const saved = await repo.save(security);
  await clearCache(userId);
  return UserSecuritySchema.parse(saved);
}

export async function updateUserSecurity(userId: string, dataIn: Partial<UserSecurity>): Promise<UserSecurity> {
  const data = encryptWrite(dataIn);
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const security = await repo.findOne({ where: { userId } });
  if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  await repo.update({ userId }, data as any);
  const updated = await repo.findOne({ where: { userId } });
  await clearCache(userId);
  return hydrate(UserSecuritySchema.parse(updated!));
}

export async function upsertUserSecurity(userId: string, dataIn: Partial<UserSecurity>): Promise<UserSecurity> {
  const data = encryptWrite(dataIn);
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const existing = await repo.findOne({ where: { userId } });

  if (existing) {
    await repo.update({ userId }, data as any);
    const updated = await repo.findOne({ where: { userId } });
    await clearCache(userId);
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
  await clearCache(userId);
  return hydrate(UserSecuritySchema.parse(saved));
}
