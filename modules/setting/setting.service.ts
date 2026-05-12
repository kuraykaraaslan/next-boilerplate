import 'reflect-metadata';
import { In } from 'typeorm';
import { getSystemDataSource } from '@/modules/db';
import { Setting as SettingEntity } from './entities/setting.entity';
import { Setting, SettingSchema } from './setting.types';
import redis from '@/modules/redis';
import SettingMessages from './setting.messages';

export default class SettingService {

  private static REDIS_KEY_PREFIX = 'settings:';
  private static REDIS_TTL = 600;

  private static getCacheKey(key?: string): string {
    return key ? `${this.REDIS_KEY_PREFIX}${key}` : `${this.REDIS_KEY_PREFIX}all`;
  }

  private static async getFromCache(cacheKey: string): Promise<string | null> {
    try { return await redis.get(cacheKey); } catch { return null; }
  }

  private static async setCache(cacheKey: string, value: string): Promise<void> {
    try { await redis.set(cacheKey, value, 'EX', this.REDIS_TTL); } catch {}
  }

  private static async deleteCache(cacheKey: string): Promise<void> {
    try { await redis.del(cacheKey); } catch {}
  }

  private static async invalidateAllCache(): Promise<void> {
    await this.deleteCache(this.getCacheKey());
  }

  static async getAll(): Promise<Setting[]> {
    const cacheKey = this.getCacheKey();
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { await this.deleteCache(cacheKey); }
    }
    const ds = await getSystemDataSource();
    const settings = await ds.getRepository(SettingEntity).find();
    const parsed = settings.map((s) => SettingSchema.parse(s));
    await this.setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKey(key: string): Promise<Setting | null> {
    const cacheKey = this.getCacheKey(key);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { await this.deleteCache(cacheKey); }
    }
    const ds = await getSystemDataSource();
    const setting = await ds.getRepository(SettingEntity).findOne({ where: { key } });
    if (!setting) return null;
    const parsed = SettingSchema.parse(setting);
    await this.setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKeys(keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (!keys.length) return result;

    const cacheKeys = keys.map((k) => this.getCacheKey(k));
    let cachedArr: (string | null)[] = [];
    try { cachedArr = await redis.mget(...cacheKeys); } catch { cachedArr = new Array(keys.length).fill(null); }

    const missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const cached = cachedArr[i];
      if (cached) {
        try { result[keys[i]] = JSON.parse(cached).value; continue; } catch {}
      }
      missingKeys.push(keys[i]);
    }

    if (missingKeys.length > 0) {
      const ds = await getSystemDataSource();
      const settings = await ds.getRepository(SettingEntity).find({ where: { key: In(missingKeys) } });
      for (const s of settings) {
        result[s.key] = s.value;
        await this.setCache(this.getCacheKey(s.key), JSON.stringify(SettingSchema.parse(s)));
      }
    }
    return result;
  }

  static async getValue(key: string): Promise<string | null> {
    return (await this.getByKey(key))?.value ?? null;
  }

  static async create(key: string, value: string, group?: string, type?: string): Promise<Setting> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SettingEntity);
    await repo.upsert({ key, value, group: group ?? 'general', type: type ?? 'string' }, ['key']);
    const saved = await repo.findOne({ where: { key } });
    const parsed = SettingSchema.parse(saved!);
    await this.setCache(this.getCacheKey(key), JSON.stringify(parsed));
    await this.invalidateAllCache();
    return parsed;
  }

  static async update(key: string, value: string): Promise<Setting> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SettingEntity);
    const existing = await repo.findOne({ where: { key } });
    if (!existing) throw new Error(SettingMessages.SETTING_NOT_FOUND);

    await repo.update({ key }, { value });
    const updated = await repo.findOne({ where: { key } });
    const parsed = SettingSchema.parse(updated!);
    await this.setCache(this.getCacheKey(key), JSON.stringify(parsed));
    await this.invalidateAllCache();
    return parsed;
  }

  static async updateMany(settings: Record<string, string>): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SettingEntity);

    for (const key in settings) {
      await repo.upsert({ key, value: settings[key], group: 'general', type: 'string' }, ['key']);
      const saved = await repo.findOne({ where: { key } });
      const parsed = SettingSchema.parse(saved!);
      updatedSettings.push(parsed);
      await this.setCache(this.getCacheKey(key), JSON.stringify(parsed));
    }
    await this.invalidateAllCache();
    return updatedSettings;
  }

  static async delete(key: string): Promise<Setting | null> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SettingEntity);
    const setting = await repo.findOne({ where: { key } });
    if (!setting) return null;
    const parsed = SettingSchema.parse(setting);
    await repo.delete({ key });
    await this.deleteCache(this.getCacheKey(key));
    await this.invalidateAllCache();
    return parsed;
  }

  static async getAllAsRecord(): Promise<Record<string, string>> {
    const settings = await this.getAll();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  static async getByGroup(group: string): Promise<Setting[]> {
    const ds = await getSystemDataSource();
    const settings = await ds.getRepository(SettingEntity).find({ where: { group } });
    return settings.map((s) => SettingSchema.parse(s));
  }

  static async clearCache(): Promise<void> {
    const ds = await getSystemDataSource();
    const settings = await ds.getRepository(SettingEntity).find({ select: { key: true } as any });
    for (const s of settings) await this.deleteCache(this.getCacheKey(s.key));
    await this.invalidateAllCache();
  }
}
