import { prisma } from "@/libs/prisma";
import { Setting, SettingSchema } from './setting.types';
import redis from '@/libs/redis';
import SettingMessages from './setting.messages';

export default class SettingService {

  private static REDIS_KEY_ALL = 'settings:all';
  private static REDIS_KEY_PREFIX = 'settings:';
  private static REDIS_TTL = 600; // 10 minutes

  // ============================================================================
  // Cache Helpers
  // ============================================================================

  private static async getFromCache(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  }

  private static async setCache(key: string, value: string): Promise<void> {
    try {
      await redis.set(key, value, 'EX', this.REDIS_TTL);
    } catch {
      // Ignore cache errors
    }
  }

  private static async deleteCache(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch {
      // Ignore cache errors
    }
  }

  private static async invalidateAllCache(): Promise<void> {
    await this.deleteCache(this.REDIS_KEY_ALL);
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  static async getAll(): Promise<Setting[]> {
    // Check cache first
    const cached = await this.getFromCache(this.REDIS_KEY_ALL);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(this.REDIS_KEY_ALL);
      }
    }

    // Fetch from DB
    const settings = await prisma.setting.findMany();
    const parsedSettings = settings.map(s => SettingSchema.parse(s));

    // Cache result
    await this.setCache(this.REDIS_KEY_ALL, JSON.stringify(parsedSettings));

    return parsedSettings;
  }

  static async getByKey(key: string): Promise<Setting | null> {
    const redisKey = this.REDIS_KEY_PREFIX + key;

    // Check cache first
    const cached = await this.getFromCache(redisKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(redisKey);
      }
    }

    // Fetch from DB
    const setting = await prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      return null;
    }

    const parsedSetting = SettingSchema.parse(setting);

    // Cache result
    await this.setCache(redisKey, JSON.stringify(parsedSetting));

    return parsedSetting;
  }

  static async getByKeys(keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    if (!Array.isArray(keys) || keys.length === 0) {
      return result;
    }

    // Try to get from Redis cache (batch)
    const redisKeys = keys.map(k => this.REDIS_KEY_PREFIX + k);
    let cachedArr: (string | null)[] = [];

    try {
      cachedArr = await redis.mget(...redisKeys);
    } catch {
      cachedArr = new Array(keys.length).fill(null);
    }

    const missingKeys: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cached = cachedArr[i];

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          result[key] = parsed.value;
          continue;
        } catch {
          // Invalid cache, will fetch from DB
        }
      }
      missingKeys.push(key);
    }

    // Fetch missing keys from DB
    if (missingKeys.length > 0) {
      const settings = await prisma.setting.findMany({
        where: { key: { in: missingKeys } }
      });

      for (const setting of settings) {
        result[setting.key] = setting.value;
        // Cache individual setting
        await this.setCache(
          this.REDIS_KEY_PREFIX + setting.key,
          JSON.stringify(SettingSchema.parse(setting))
        );
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
    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        ...(group && { group }),
        ...(type && { type })
      },
      create: {
        key,
        value,
        group: group ?? 'general',
        type: type ?? 'string'
      }
    });

    const parsedSetting = SettingSchema.parse(setting);

    // Update cache
    await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
    await this.invalidateAllCache();

    return parsedSetting;
  }

  static async update(key: string, value: string): Promise<Setting> {
    const setting = await prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      throw new Error(SettingMessages.SETTING_NOT_FOUND);
    }

    const updatedSetting = await prisma.setting.update({
      where: { key },
      data: { value }
    });

    const parsedSetting = SettingSchema.parse(updatedSetting);

    // Update cache
    await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
    await this.invalidateAllCache();

    return parsedSetting;
  }

  static async updateMany(settings: Record<string, string>): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    for (const key in settings) {
      const upsertedSetting = await prisma.setting.upsert({
        where: { key },
        update: { value: settings[key] },
        create: {
          key,
          value: settings[key],
          group: 'general',
          type: 'string'
        }
      });

      const parsedSetting = SettingSchema.parse(upsertedSetting);
      updatedSettings.push(parsedSetting);

      // Update individual cache
      await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
    }

    // Invalidate all cache
    await this.invalidateAllCache();

    return updatedSettings;
  }

  static async delete(key: string): Promise<Setting | null> {
    const setting = await prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      return null;
    }

    const parsedSetting = SettingSchema.parse(setting);
    await prisma.setting.delete({ where: { key } });

    // Clear cache
    await this.deleteCache(this.REDIS_KEY_PREFIX + key);
    await this.invalidateAllCache();

    return parsedSetting;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async getAllAsRecord(): Promise<Record<string, string>> {
    const settings = await this.getAll();
    const result: Record<string, string> = {};

    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  static async getByGroup(group: string): Promise<Setting[]> {
    const settings = await prisma.setting.findMany({ where: { group } });
    return settings.map(s => SettingSchema.parse(s));
  }

  static async clearCache(): Promise<void> {
    // Clear all settings cache
    const settings = await prisma.setting.findMany({ select: { key: true } });

    for (const setting of settings) {
      await this.deleteCache(this.REDIS_KEY_PREFIX + setting.key);
    }

    await this.invalidateAllCache();
  }
}
