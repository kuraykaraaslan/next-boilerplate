import { prisma } from "@/libs/prisma";
import { Setting, SettingSchema } from './setting.types';
import redis from '@/libs/redis';
import SettingMessages from './setting.messages';

// System-wide settings use this tenant ID
export const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export default class SettingService {

  private static REDIS_KEY_PREFIX = 'settings:';
  private static REDIS_TTL = 600; // 10 minutes

  // ============================================================================
  // Cache Helpers
  // ============================================================================

  private static getCacheKey(tenantId: string, key?: string): string {
    if (key) {
      return `${this.REDIS_KEY_PREFIX}${tenantId}:${key}`;
    }
    return `${this.REDIS_KEY_PREFIX}${tenantId}:all`;
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

  private static async invalidateAllCache(tenantId: string): Promise<void> {
    await this.deleteCache(this.getCacheKey(tenantId));
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  static async getAll(tenantId: string = SYSTEM_TENANT_ID): Promise<Setting[]> {
    const cacheKey = this.getCacheKey(tenantId);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(cacheKey);
      }
    }

    // Fetch from DB
    const settings = await prisma.setting.findMany({
      where: { tenantId }
    });
    const parsedSettings = settings.map(s => SettingSchema.parse(s));

    // Cache result
    await this.setCache(cacheKey, JSON.stringify(parsedSettings));

    return parsedSettings;
  }

  static async getByKey(key: string, tenantId: string = SYSTEM_TENANT_ID): Promise<Setting | null> {
    const cacheKey = this.getCacheKey(tenantId, key);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(cacheKey);
      }
    }

    // Fetch from DB
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      return null;
    }

    const parsedSetting = SettingSchema.parse(setting);

    // Cache result
    await this.setCache(cacheKey, JSON.stringify(parsedSetting));

    return parsedSetting;
  }

  static async getByKeys(keys: string[], tenantId: string = SYSTEM_TENANT_ID): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    if (!Array.isArray(keys) || keys.length === 0) {
      return result;
    }

    // Try to get from Redis cache (batch)
    const cacheKeys = keys.map(k => this.getCacheKey(tenantId, k));
    let cachedArr: (string | null)[] = [];

    try {
      cachedArr = await redis.mget(...cacheKeys);
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
        where: {
          tenantId,
          key: { in: missingKeys }
        }
      });

      for (const setting of settings) {
        result[setting.key] = setting.value;
        // Cache individual setting
        await this.setCache(
          this.getCacheKey(tenantId, setting.key),
          JSON.stringify(SettingSchema.parse(setting))
        );
      }
    }

    return result;
  }

  static async getValue(key: string, tenantId: string = SYSTEM_TENANT_ID): Promise<string | null> {
    const setting = await this.getByKey(key, tenantId);
    return setting?.value ?? null;
  }

  /**
   * Get value with fallback to system settings if tenant setting not found
   */
  static async getValueWithFallback(key: string, tenantId: string): Promise<string | null> {
    // First try tenant-specific setting
    const tenantSetting = await this.getByKey(key, tenantId);
    if (tenantSetting) {
      return tenantSetting.value;
    }

    // Fallback to system setting
    if (tenantId !== SYSTEM_TENANT_ID) {
      const systemSetting = await this.getByKey(key, SYSTEM_TENANT_ID);
      return systemSetting?.value ?? null;
    }

    return null;
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  static async create(
    key: string,
    value: string,
    tenantId: string = SYSTEM_TENANT_ID,
    group?: string,
    type?: string
  ): Promise<Setting> {
    const setting = await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: {
        value,
        ...(group && { group }),
        ...(type && { type })
      },
      create: {
        tenantId,
        key,
        value,
        group: group ?? 'general',
        type: type ?? 'string'
      }
    });

    const parsedSetting = SettingSchema.parse(setting);

    // Update cache
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsedSetting));
    await this.invalidateAllCache(tenantId);

    return parsedSetting;
  }

  static async update(key: string, value: string, tenantId: string = SYSTEM_TENANT_ID): Promise<Setting> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      throw new Error(SettingMessages.SETTING_NOT_FOUND);
    }

    const updatedSetting = await prisma.setting.update({
      where: { tenantId_key: { tenantId, key } },
      data: { value }
    });

    const parsedSetting = SettingSchema.parse(updatedSetting);

    // Update cache
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsedSetting));
    await this.invalidateAllCache(tenantId);

    return parsedSetting;
  }

  static async updateMany(
    settings: Record<string, string>,
    tenantId: string = SYSTEM_TENANT_ID
  ): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    for (const key in settings) {
      const upsertedSetting = await prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value: settings[key] },
        create: {
          tenantId,
          key,
          value: settings[key],
          group: 'general',
          type: 'string'
        }
      });

      const parsedSetting = SettingSchema.parse(upsertedSetting);
      updatedSettings.push(parsedSetting);

      // Update individual cache
      await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsedSetting));
    }

    // Invalidate all cache
    await this.invalidateAllCache(tenantId);

    return updatedSettings;
  }

  static async delete(key: string, tenantId: string = SYSTEM_TENANT_ID): Promise<Setting | null> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      return null;
    }

    const parsedSetting = SettingSchema.parse(setting);
    await prisma.setting.delete({
      where: { tenantId_key: { tenantId, key } }
    });

    // Clear cache
    await this.deleteCache(this.getCacheKey(tenantId, key));
    await this.invalidateAllCache(tenantId);

    return parsedSetting;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async getAllAsRecord(tenantId: string = SYSTEM_TENANT_ID): Promise<Record<string, string>> {
    const settings = await this.getAll(tenantId);
    const result: Record<string, string> = {};

    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  static async getByGroup(group: string, tenantId: string = SYSTEM_TENANT_ID): Promise<Setting[]> {
    const settings = await prisma.setting.findMany({
      where: { tenantId, group }
    });
    return settings.map(s => SettingSchema.parse(s));
  }

  static async clearCache(tenantId: string = SYSTEM_TENANT_ID): Promise<void> {
    // Clear all settings cache for tenant
    const settings = await prisma.setting.findMany({
      where: { tenantId },
      select: { key: true }
    });

    for (const setting of settings) {
      await this.deleteCache(this.getCacheKey(tenantId, setting.key));
    }

    await this.invalidateAllCache(tenantId);
  }
}
