import { prisma } from "@/libs/prisma";
import { TenantSetting, TenantSettingSchema } from './tenant_setting.types';
import redis from '@/libs/redis';
import TenantSettingMessages from './tenant_setting.messages';

export default class TenantSettingService {

  private static REDIS_KEY_PREFIX = 'tenant_settings:';
  private static REDIS_TTL = 600; // 10 minutes

  // ============================================================================
  // Cache Helpers
  // ============================================================================

  private static getCacheKey(tenantId: string, suffix?: string): string {
    return suffix
      ? `${this.REDIS_KEY_PREFIX}${tenantId}:${suffix}`
      : `${this.REDIS_KEY_PREFIX}${tenantId}:all`;
  }

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

  private static async invalidateTenantCache(tenantId: string): Promise<void> {
    try {
      const pattern = `${this.REDIS_KEY_PREFIX}${tenantId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore cache errors
    }
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  static async getAll(tenantId: string): Promise<TenantSetting[]> {
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
    const settings = await prisma.tenantSetting.findMany({
      where: { tenantId }
    });
    const parsedSettings = settings.map(s => TenantSettingSchema.parse(s));

    // Cache result
    await this.setCache(cacheKey, JSON.stringify(parsedSettings));

    return parsedSettings;
  }

  static async getByKey(tenantId: string, key: string): Promise<TenantSetting | null> {
    const cacheKey = this.getCacheKey(tenantId, `key:${key}`);

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
    const setting = await prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      return null;
    }

    const parsedSetting = TenantSettingSchema.parse(setting);

    // Cache result
    await this.setCache(cacheKey, JSON.stringify(parsedSetting));

    return parsedSetting;
  }

  static async getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    if (!Array.isArray(keys) || keys.length === 0) {
      return result;
    }

    // Try to get from Redis cache (batch)
    const redisKeys = keys.map(k => this.getCacheKey(tenantId, `key:${k}`));
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
      const settings = await prisma.tenantSetting.findMany({
        where: { tenantId, key: { in: missingKeys } }
      });

      for (const setting of settings) {
        result[setting.key] = setting.value;
        // Cache individual setting
        await this.setCache(
          this.getCacheKey(tenantId, `key:${setting.key}`),
          JSON.stringify(TenantSettingSchema.parse(setting))
        );
      }
    }

    return result;
  }

  static async getValue(tenantId: string, key: string): Promise<string | null> {
    const setting = await this.getByKey(tenantId, key);
    return setting?.value ?? null;
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  static async create(
    tenantId: string,
    key: string,
    value: string,
    group?: string,
    type?: string
  ): Promise<TenantSetting> {
    const setting = await prisma.tenantSetting.upsert({
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

    const parsedSetting = TenantSettingSchema.parse(setting);

    // Update cache
    await this.setCache(this.getCacheKey(tenantId, `key:${key}`), JSON.stringify(parsedSetting));
    await this.deleteCache(this.getCacheKey(tenantId));

    return parsedSetting;
  }

  static async update(tenantId: string, key: string, value: string): Promise<TenantSetting> {
    const setting = await prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      throw new Error(TenantSettingMessages.SETTING_NOT_FOUND);
    }

    const updatedSetting = await prisma.tenantSetting.update({
      where: { tenantId_key: { tenantId, key } },
      data: { value }
    });

    const parsedSetting = TenantSettingSchema.parse(updatedSetting);

    // Update cache
    await this.setCache(this.getCacheKey(tenantId, `key:${key}`), JSON.stringify(parsedSetting));
    await this.deleteCache(this.getCacheKey(tenantId));

    return parsedSetting;
  }

  static async updateMany(tenantId: string, settings: Record<string, string>): Promise<TenantSetting[]> {
    const updatedSettings: TenantSetting[] = [];

    for (const key in settings) {
      const upsertedSetting = await prisma.tenantSetting.upsert({
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

      const parsedSetting = TenantSettingSchema.parse(upsertedSetting);
      updatedSettings.push(parsedSetting);

      // Update individual cache
      await this.setCache(this.getCacheKey(tenantId, `key:${key}`), JSON.stringify(parsedSetting));
    }

    // Invalidate all cache for tenant
    await this.deleteCache(this.getCacheKey(tenantId));

    return updatedSettings;
  }

  static async delete(tenantId: string, key: string): Promise<TenantSetting | null> {
    const setting = await prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } }
    });

    if (!setting) {
      return null;
    }

    const parsedSetting = TenantSettingSchema.parse(setting);
    await prisma.tenantSetting.delete({ where: { tenantId_key: { tenantId, key } } });

    // Clear cache
    await this.deleteCache(this.getCacheKey(tenantId, `key:${key}`));
    await this.deleteCache(this.getCacheKey(tenantId));

    return parsedSetting;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    const settings = await this.getAll(tenantId);
    const result: Record<string, string> = {};

    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  static async getByGroup(tenantId: string, group: string): Promise<TenantSetting[]> {
    const cacheKey = this.getCacheKey(tenantId, `group:${group}`);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.deleteCache(cacheKey);
      }
    }

    const settings = await prisma.tenantSetting.findMany({
      where: { tenantId, group }
    });
    const parsedSettings = settings.map(s => TenantSettingSchema.parse(s));

    // Cache result
    await this.setCache(cacheKey, JSON.stringify(parsedSettings));

    return parsedSettings;
  }

  static async clearCache(tenantId: string): Promise<void> {
    await this.invalidateTenantCache(tenantId);
  }

  static async deleteAllForTenant(tenantId: string): Promise<number> {
    const result = await prisma.tenantSetting.deleteMany({
      where: { tenantId }
    });

    await this.invalidateTenantCache(tenantId);

    return result.count;
  }

  static async copyFromTenant(
    sourceTenantId: string,
    targetTenantId: string,
    overwrite: boolean = false
  ): Promise<TenantSetting[]> {
    const sourceSettings = await this.getAll(sourceTenantId);
    const copiedSettings: TenantSetting[] = [];

    for (const setting of sourceSettings) {
      if (!overwrite) {
        const existing = await this.getByKey(targetTenantId, setting.key);
        if (existing) continue;
      }

      const copied = await this.create(
        targetTenantId,
        setting.key,
        setting.value,
        setting.group,
        setting.type
      );
      copiedSettings.push(copied);
    }

    return copiedSettings;
  }
}
