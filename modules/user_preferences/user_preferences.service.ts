import 'reflect-metadata';
import { getSystemDataSource } from '@/libs/typeorm';
import { UserPreferences as UserPreferencesEntity } from './entities/user_preferences.entity';
import { UserPreferences, UserPreferencesDefault, UserPreferencesSchema } from './user_preferences.types';

export default class UserPreferencesService {

  static async getByUserId(userId: string): Promise<UserPreferences | null> {
    const ds = await getSystemDataSource();
    const prefs = await ds.getRepository(UserPreferencesEntity).findOne({ where: { userId } });
    return prefs ? UserPreferencesSchema.parse(prefs) : null;
  }

  static async create(userId: string, data?: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) throw new Error('Preferences already exist for this user');

    const prefs = repo.create({ userId, ...UserPreferencesDefault, ...data });
    const saved = await repo.save(prefs);
    return UserPreferencesSchema.parse(saved);
  }

  static async update(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new Error('Preferences not found');

    await repo.update({ userId }, data as any);
    const updated = await repo.findOne({ where: { userId } });
    return UserPreferencesSchema.parse(updated!);
  }

  static async upsert(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });

    if (existing) {
      await repo.update({ userId }, data as any);
      const updated = await repo.findOne({ where: { userId } });
      return UserPreferencesSchema.parse(updated!);
    }

    const defaults = UserPreferencesSchema.parse({});
    const prefs = repo.create({ userId, ...defaults, ...data });
    const saved = await repo.save(prefs);
    return UserPreferencesSchema.parse(saved);
  }

  static async delete(userId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const prefs = await repo.findOne({ where: { userId } });
    if (!prefs) throw new Error('Preferences not found');
    await repo.delete({ userId });
  }

  static async getOrCreateDefault(userId: string): Promise<UserPreferences> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(UserPreferencesEntity);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return UserPreferencesSchema.parse(existing);
    return this.create(userId);
  }
}
