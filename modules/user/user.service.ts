import 'reflect-metadata';
import { ILike } from 'typeorm';
import { getSystemDataSource } from '@/modules/db';
import redis from '@/modules/redis';
import { env } from '@/modules/env';
import { User as UserEntity } from './entities/user.entity';
import { User, SafeUser, UpdateUser, SafeUserSchema, UserSchema } from './user.types';
import type { UserRole, UserStatus } from './user.enums';
import bcrypt from 'bcrypt';
import UserMessages from './user.messages';

const USER_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

export default class UserService {

  static async invalidate(user: { userId: string; email?: string }): Promise<void> {
    const ops: Promise<unknown>[] = [redis.del(`user:id:${user.userId}`)];
    if (user.email) ops.push(redis.del(`user:email:${user.email.toLowerCase()}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static async create({ email, password, phone, userRole }: {
    email: string;
    password: string;
    phone?: string;
    userRole?: UserRole;
  }): Promise<SafeUser> {
    if (!email) throw new Error(UserMessages.INVALID_EMAIL);

    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);

    const existingUser = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) throw new Error(UserMessages.EMAIL_ALREADY_EXISTS);
    if (!password) throw new Error(UserMessages.INVALID_PASSWORD);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = repo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      userRole: userRole ?? 'USER',
      userStatus: 'ACTIVE',
    });
    const saved = await repo.save(user);
    return SafeUserSchema.parse(saved);
  }

  static async getAll({ page, pageSize, search, userId }: {
    page: number;
    pageSize: number;
    search?: string;
    userId?: string;
  }): Promise<{ users: SafeUser[]; total: number }> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);

    const baseWhere: Record<string, unknown> = {};
    if (userId) baseWhere.userId = userId;

    let whereConditions: Record<string, unknown>[];
    if (search) {
      whereConditions = [
        { ...baseWhere, email: ILike(`%${search}%`) },
      ];
    } else {
      whereConditions = [baseWhere];
    }

    const [users, total] = await Promise.all([
      repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize }),
      repo.count({ where: whereConditions as any }),
    ]);

    return { users: users.map((u) => SafeUserSchema.parse(u)), total };
  }

  static async getById(userId: string): Promise<SafeUser> {
    const cacheKey = `user:id:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeUserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { userId } });
    if (!user) throw new Error(UserMessages.USER_NOT_FOUND);

    const parsed = SafeUserSchema.parse(user);
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(parsed)).catch(() => {});
    return parsed;
  }

  static async update({ userId, data }: { userId: string; data: UpdateUser }): Promise<SafeUser> {
    if (!userId) throw new Error(UserMessages.USER_NOT_FOUND);
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new Error(UserMessages.USER_NOT_FOUND);

    await repo.update({ userId }, {
      email: data.email || undefined,
      phone: data.phone || undefined,
      userRole: data.userRole as UserRole | undefined,
      userStatus: data.userStatus as UserStatus | undefined,
    });
    const updated = await repo.findOne({ where: { userId } });

    await this.invalidate({ userId, email: user.email });
    if (updated && updated.email !== user.email) {
      await this.invalidate({ userId, email: updated.email });
    }

    return SafeUserSchema.parse(updated!);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserEntity);
    const user = await repo.findOne({ where: { userId } });
    if (!user) throw new Error(UserMessages.USER_NOT_FOUND);
    await repo.delete({ userId });
    await this.invalidate({ userId, email: user.email });
  }

  static async getByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const cacheKey = `user:email:${normalized}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return UserSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    const ds = await getSystemDataSource();
    const user = await ds.getRepository(UserEntity).findOne({ where: { email: normalized } });
    if (!user) return null;

    const parsed = UserSchema.parse(user);
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(parsed)).catch(() => {});
    return parsed;
  }
}
