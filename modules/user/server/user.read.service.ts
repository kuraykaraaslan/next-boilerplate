import 'reflect-metadata';
import { ILike } from 'typeorm';
import { getDataSource } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { User as UserEntity } from './entities/user.entity';
import { User, SafeUser, SafeUserSchema, UserSchema } from './user.types';
import UserMessages from './user.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { USER_CACHE_TTL, NEGATIVE_CACHE_TTL, NEG } from './user.helpers';

export async function getAll({ page, pageSize, search, userId, tenantId, phone }: {
  page: number;
  pageSize: number;
  search?: string;
  userId?: string;
  tenantId?: string;
  phone?: string;
}): Promise<{ users: SafeUser[]; total: number }> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);

  // Tenant-scoped search: join with tenant_members when tenantId provided
  if (tenantId) {
    const qb = ds.createQueryBuilder(UserEntity, 'u')
      .innerJoin('tenant_members', 'tm', 'tm."userId" = u."userId" AND tm."tenantId" = :tenantId', { tenantId })
      .skip(page * pageSize)
      .take(pageSize)
      .orderBy('u."createdAt"', 'DESC');

    if (search) {
      qb.where('u.email ILIKE :search', { search: `%${search}%` });
    }
    if (phone) {
      qb.andWhere('u.phone ILIKE :phone', { phone: `%${phone}%` });
    }

    const [users, total] = await qb.getManyAndCount();
    return { users: users.map((u) => SafeUserSchema.parse(u)), total };
  }

  const baseWhere: Record<string, unknown> = {};
  if (userId) baseWhere.userId = userId;
  if (phone) baseWhere.phone = ILike(`%${phone}%`);

  let whereConditions: Record<string, unknown>[];
  if (search) {
    whereConditions = [{ ...baseWhere, email: ILike(`%${search}%`) }];
  } else {
    whereConditions = [baseWhere];
  }

  const [users, total] = await Promise.all([
    repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize }),
    repo.count({ where: whereConditions as any }),
  ]);

  return { users: users.map((u) => SafeUserSchema.parse(u)), total };
}

export async function getById(userId: string): Promise<SafeUser> {
  const cacheKey = `user:id:${userId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try { return SafeUserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const parsed = SafeUserSchema.parse(user);
    await redis.setex(cacheKey, jitter(USER_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return parsed;
  });
}

export async function getByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase();
  const cacheKey = `user:email:${normalized}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached === NEG) return null;
  if (cached) {
    try { return UserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await getDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email: normalized } });
    if (!user) {
      await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
      return null;
    }

    const parsed = UserSchema.parse(user);
    await redis.setex(cacheKey, jitter(USER_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return parsed;
  });
}
