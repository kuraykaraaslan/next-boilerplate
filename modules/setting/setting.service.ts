import { systemPrisma } from "@/libs/prisma";
import { Setting, SettingSchema } from './setting.types';
import redis from '@/libs/redis';
import SettingMessages from './setting.messages';

export default class SettingService {

  private static REDIS_KEY_PREFIX = 'settings:';
  private static REDIS_TTL = 600; // 10 minutes

  // ============================================================================
  // Cache Helpers
  // ============================================================================

  private static getCacheKey(key?: string): string {
    if (key) return `${this.REDIS_KEY_PREFIX}${key}`;
    return `${this.REDIS_KEY_PREFIX}all`;
  }

  private static async getFromCache(cacheKey: string): Promise<string | null> {
    try {
      return await redis.get(cacheKey);
    } catch {
      return null;
    }
  }

  private static async setCache(cacheKey: string, value: string): Promise<void> {
    try {
      await redis.set(cacheKey, value, 'EX', this.REDIS_TTL);
    } catch {
      // Ignore cache errors
    }
  }

  private static async deleteCache(cacheKey: string): Promise<void> {
    try {
      await redis.del(cacheKey);
    } catch {
      // Ignore cache errors
    }
  }

  private static async invalidateAllCache(): Promise<void> {
    await this.deleteCache(this.getCacheKey());
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  static async getAll(): Promise<Setting[]> {
    const cacheKey = this.getCacheKey();

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(cacheKey);
      }
    }

    const settings = await systemPrisma.setting.findMany();
    const parsedSettings = settings.map(s => SettingSchema.parse(s));

    await this.setCache(cacheKey, JSON.stringify(parsedSettings));
    return parsedSettings;
  }

  static async getByKey(key: string): Promise<Setting | null> {
    const cacheKey = this.getCacheKey(key);

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(cacheKey);
      }
    }

    const setting = await systemPrisma.setting.findUnique({ where: { key } });
    if (!setting) return null;

    const parsedSetting = SettingSchema.parse(setting);
    await this.setCache(cacheKey, JSON.stringify(parsedSetting));
    return parsedSetting;
  }

  static async getByKeys(keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (!Array.isArray(keys) || keys.length === 0) return result;

    const cacheKeys = keys.map(k => this.getCacheKey(k));
    let cachedArr: (string | null)[] = [];
    try {
      cachedArr = await redis.mget(...cacheKeys);
    } catch {
      cachedArr = new Array(keys.length).fill(null);
    }

    const missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const cached = cachedArr[i];
      if (cached) {
        try {
          result[keys[i]] = JSON.parse(cached).value;
          continue;
        } catch {
          // fall through
        }
      }
      missingKeys.push(keys[i]);
    }

    if (missingKeys.length > 0) {
      const settings = await systemPrisma.setting.findMany({
        where: { key: { in: missingKeys } }
      });
      for (const setting of settings) {
        result[setting.key] = setting.value;
        await this.setCache(this.getCacheKey(setting.key), JSON.stringify(SettingSchema.parse(setting)));
      }
    }

    return result;
  }

  static async getValue(key: string): Promise<string | null> {
    const setting = await this.getByKey(key);
    return setting?.value ?? null;
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  static async create(key: string, value: string, group?: string, type?: string): Promise<Setting> {
    const setting = await systemPrisma.setting.upsert({
      where: { key },
      update: { value, ...(group && { group }), ...(type && { type }) },
      create: { key, value, group: group ?? 'general', type: type ?? 'string' }
    });

    const parsedSetting = SettingSchema.parse(setting);
    await this.setCache(this.getCacheKey(key), JSON.stringify(parsedSetting));
    await this.invalidateAllCache();
    return parsedSetting;
  }

  static async update(key: string, value: string): Promise<Setting> {
    const existing = await systemPrisma.setting.findUnique({ where: { key } });
    if (!existing) throw new Error(SettingMessages.SETTING_NOT_FOUND);

    const updated = await systemPrisma.setting.update({ where: { key }, data: { value } });
    const parsedSetting = SettingSchema.parse(updated);

    await this.setCache(this.getCacheKey(key), JSON.stringify(parsedSetting));
    await this.invalidateAllCache();
    return parsedSetting;
  }

  static async updateMany(settings: Record<string, string>): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    for (const key in settings) {
      const upserted = await systemPrisma.setting.upsert({
        where: { key },
        update: { value: settings[key] },
        create: { key, value: settings[key], group: 'general', type: 'string' }
      });
      const parsed = SettingSchema.parse(upserted);
      updatedSettings.push(parsed);
      await this.setCache(this.getCacheKey(key), JSON.stringify(parsed));
    }

    await this.invalidateAllCache();
    return updatedSettings;
  }

  static async delete(key: string): Promise<Setting | null> {
    const setting = await systemPrisma.setting.findUnique({ where: { key } });
    if (!setting) return null;

    const parsedSetting = SettingSchema.parse(setting);
    await systemPrisma.setting.delete({ where: { key } });

    await this.deleteCache(this.getCacheKey(key));
    await this.invalidateAllCache();
    return parsedSetting;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async getAllAsRecord(): Promise<Record<string, string>> {
    const settings = await this.getAll();
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
  }

  static async getByGroup(group: string): Promise<Setting[]> {
    const settings = await systemPrisma.setting.findMany({ where: { group } });
    return settings.map(s => SettingSchema.parse(s));
  }

  static async clearCache(): Promise<void> {
    const settings = await systemPrisma.setting.findMany({ select: { key: true } });
    for (const s of settings) {
      await this.deleteCache(this.getCacheKey(s.key));
    }
    await this.invalidateAllCache();
  }
}
