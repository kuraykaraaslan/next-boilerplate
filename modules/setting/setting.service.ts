import { In } from "typeorm";
import { SettingEntity } from './setting.entity';
import { Setting, SettingSchema } from './setting.types';
import redis from '@/libs/redis';
import SettingMessages from './setting.messages';
import AppDataSource from '@/libs/typeorm';

export default class SettingService {

  private static readonly repository = AppDataSource.getRepository(SettingEntity);

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
    const settings = await this.repository.find();
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
    const setting = await this.repository.findOne({ where: { key } });

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
      const settings = await this.repository.find({
        where: { key: In(missingKeys) }
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
    const existingSetting = await this.repository.findOne({ where: { key } });

    let setting: SettingEntity;

    if (existingSetting) {
      // Update existing
      existingSetting.value = value;
      if (group) existingSetting.group = group;
      if (type) existingSetting.type = type;
      setting = await this.repository.save(existingSetting);
    } else {
      // Create new
      setting = this.repository.create({
        key,
        value,
        group: group ?? 'general',
        type: type ?? 'string'
      });
      setting = await this.repository.save(setting);
    }

    const parsedSetting = SettingSchema.parse(setting);

    // Update cache
    await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
    await this.invalidateAllCache();

    return parsedSetting;
  }

  static async update(key: string, value: string): Promise<Setting> {
    const setting = await this.repository.findOne({ where: { key } });

    if (!setting) {
      throw new Error(SettingMessages.SETTING_NOT_FOUND);
    }

    setting.value = value;
    const updatedSetting = await this.repository.save(setting);
    const parsedSetting = SettingSchema.parse(updatedSetting);

    // Update cache
    await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
    await this.invalidateAllCache();

    return parsedSetting;
  }

  static async updateMany(settings: Record<string, string>): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    for (const key in settings) {
      const setting = await this.repository.upsert(
        {
          key,
          value: settings[key],
          group: 'general',
          type: 'string'
        },
        ['key']
      );

      // Fetch the upserted setting
      const upsertedSetting = await this.repository.findOne({ where: { key } });

      if (upsertedSetting) {
        const parsedSetting = SettingSchema.parse(upsertedSetting);
        updatedSettings.push(parsedSetting);

        // Update individual cache
        await this.setCache(this.REDIS_KEY_PREFIX + key, JSON.stringify(parsedSetting));
      }
    }

    // Invalidate all cache
    await this.invalidateAllCache();

    return updatedSettings;
  }

  static async delete(key: string): Promise<Setting | null> {
    const setting = await this.repository.findOne({ where: { key } });

    if (!setting) {
      return null;
    }

    const parsedSetting = SettingSchema.parse(setting);
    await this.repository.delete({ key });

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
    const settings = await this.repository.find({ where: { group } });
    return settings.map(s => SettingSchema.parse(s));
  }

  static async clearCache(): Promise<void> {
    // Clear all settings cache
    const settings = await this.repository.find({ select: ['key'] });

    for (const setting of settings) {
      await this.deleteCache(this.REDIS_KEY_PREFIX + setting.key);
    }

    await this.invalidateAllCache();
  }
}
