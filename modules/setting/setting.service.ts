import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { Setting as SettingEntity } from './entities/setting.entity';
import { Setting, SettingSchema } from './setting.types';
import redis from '@/modules/redis';
import SettingMessages from './setting.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class SettingService {

  private static REDIS_KEY_PREFIX = 'settings:';
  private static REDIS_TTL = 600;

  private static getCacheKey(tenantId: string, key?: string): string {
    return key
      ? `${this.REDIS_KEY_PREFIX}${tenantId}:${key}`
      : `${this.REDIS_KEY_PREFIX}${tenantId}:all`;
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

  private static async invalidateAllCache(tenantId: string): Promise<void> {
    await this.deleteCache(this.getCacheKey(tenantId));
  }

  static async getAll(tenantId: string): Promise<Setting[]> {
    const cacheKey = this.getCacheKey(tenantId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { await this.deleteCache(cacheKey); }
    }
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId } });
    const parsed = settings.map((s) => SettingSchema.parse(s));
    await this.setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKey(tenantId: string, key: string): Promise<Setting | null> {
    const cacheKey = this.getCacheKey(tenantId, key);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { await this.deleteCache(cacheKey); }
    }
    const ds = await tenantDataSourceFor(tenantId);
    const setting = await ds.getRepository(SettingEntity).findOne({ where: { tenantId, key } });
    if (!setting) return null;
    const parsed = SettingSchema.parse(setting);
    await this.setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (!keys.length) return result;

    const cacheKeys = keys.map((k) => this.getCacheKey(tenantId, k));
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
      const ds = await tenantDataSourceFor(tenantId);
      const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId, key: In(missingKeys) } });
      for (const s of settings) {
        result[s.key] = s.value;
        await this.setCache(this.getCacheKey(tenantId, s.key), JSON.stringify(SettingSchema.parse(s)));
      }
    }
    return result;
  }

  static async getValue(tenantId: string, key: string): Promise<string | null> {
    return (await this.getByKey(tenantId, key))?.value ?? null;
  }

  static async create(tenantId: string, key: string, value: string, group?: string, type?: string): Promise<Setting> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const now = new Date();
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (existing) {
      await repo.update(
        { tenantId, key },
        { value, group: group ?? existing.group, type: type ?? existing.type, updatedAt: now },
      );
    } else {
      await repo.insert({ tenantId, key, value, group: group ?? 'general', type: type ?? 'string', createdAt: now, updatedAt: now });
    }
    const saved = await repo.findOne({ where: { tenantId, key } });
    const parsed = SettingSchema.parse(saved!);
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsed));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async update(tenantId: string, key: string, value: string): Promise<Setting> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (!existing) throw new AppError(SettingMessages.SETTING_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await repo.update({ tenantId, key }, { value, updatedAt: new Date() });
    const updated = await repo.findOne({ where: { tenantId, key } });
    const parsed = SettingSchema.parse(updated!);
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsed));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async updateMany(tenantId: string, settings: Record<string, string>): Promise<Setting[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const now = new Date();

    const updatedSettings = await ds.transaction(async (mgr) => {
      const repo = mgr.getRepository(SettingEntity);
      const result: Setting[] = [];
      for (const key in settings) {
        const existing = await repo.findOne({ where: { tenantId, key } });
        if (existing) {
          await repo.update({ tenantId, key }, { value: settings[key], updatedAt: now });
        } else {
          await repo.insert({
            tenantId,
            key,
            value: settings[key],
            group: 'general',
            type: 'string',
            createdAt: now,
            updatedAt: now,
          });
        }
        const saved = await repo.findOne({ where: { tenantId, key } });
        result.push(SettingSchema.parse(saved!));
      }
      return result;
    });

    for (const parsed of updatedSettings) {
      await this.setCache(this.getCacheKey(tenantId, parsed.key), JSON.stringify(parsed));
    }
    await this.invalidateAllCache(tenantId);
    return updatedSettings;
  }

  static async delete(tenantId: string, key: string): Promise<Setting | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SettingEntity);
    const setting = await repo.findOne({ where: { tenantId, key } });
    if (!setting) return null;
    const parsed = SettingSchema.parse(setting);
    await repo.delete({ tenantId, key });
    await this.deleteCache(this.getCacheKey(tenantId, key));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    const settings = await this.getAll(tenantId);
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  static async getByGroup(tenantId: string, group: string): Promise<Setting[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId, group } });
    return settings.map((s) => SettingSchema.parse(s));
  }

  static async clearCache(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId }, select: { key: true } as any });
    for (const s of settings) await this.deleteCache(this.getCacheKey(tenantId, s.key));
    await this.invalidateAllCache(tenantId);
  }
}
