import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { UserPreferences as UserPreferencesEntity } from './entities/user_preferences.entity';
import { UserPreferences, UserPreferencesDefault, UserPreferencesSchema } from './user_preferences.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserPreferencesMessages from './user_preferences.messages';

const USER_PREFERENCES_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

export default class UserPreferencesService {

  private static async clearCache(userId: string): Promise<void> {
    await redis.del(`user_preferences:user:${userId}`).catch(() => {});
  }

  static async getByUserId(userId: string): Promise<UserPreferences | null> {
    const cacheKey = `user_preferences:user:${userId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed === null ? null : UserPreferencesSchema.parse(parsed);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const prefs = await ds.getRepository(UserPreferencesEntity).findOne({ where: { userId } });
      const result = prefs ? UserPreferencesSchema.parse(prefs) : null;
      await redis.setex(cacheKey, jitter(USER_PREFERENCES_CACHE_TTL), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async create(userId: string, data?: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new AppError(UserPreferencesMessages.PREFERENCES_ALREADY_EXIST, 409, ErrorCode.CONFLICT);

    const prefs = repo.create({ userId, ...UserPreferencesDefault, ...data });
    const saved = await repo.save(prefs);
    await this.clearCache(userId);
    return UserPreferencesSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new AppError(UserPreferencesMessages.PREFERENCES_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    Object.assign(prefs, UserPreferencesSchema.partial().parse(data));
    const saved = await repo.save(prefs);
    await this.clearCache(userId);
    return UserPreferencesSchema.parse(saved);
  }

  static async upsert(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      Object.assign(existing, UserPreferencesSchema.partial().parse(data));
      const saved = await repo.save(existing);
      await this.clearCache(userId);
      return UserPreferencesSchema.parse(saved);
    }

    const defaults = UserPreferencesSchema.parse({});
    const prefs = repo.create({ userId, ...defaults, ...data });
    const saved = await repo.save(prefs);
    await this.clearCache(userId);
    return UserPreferencesSchema.parse(saved);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new AppError(UserPreferencesMessages.PREFERENCES_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ userId });
    await this.clearCache(userId);
  }

  static async getOrCreateDefault(userId: string): Promise<UserPreferences> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return UserPreferencesSchema.parse(existing);
    return this.create(userId);
  }
}
