import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/libs/typeorm';
import { TenantSetting as TenantSettingEntity } from './entities/tenant_setting.entity';
import redis from '@/libs/redis';
import SettingService from '@/modules/setting/setting.service';
import { SettingSchema } from '@/modules/setting/setting.types';
import type { Setting } from '@/modules/setting/setting.types';

export default class TenantSettingService {

  private static REDIS_KEY_PREFIX = 'tenant_settings:';
  private static REDIS_TTL = 600;

  private static getCacheKey(tenantId: string, key?: string): string {
    if (key) return `${this.REDIS_KEY_PREFIX}${tenantId}:${key}`;
    return `${this.REDIS_KEY_PREFIX}${tenantId}:all`;
  }

  private static async getFromCache(cacheKey: string): Promise<string | null> {
    try { return await redis.get(cacheKey); } catch { return null; }
  }

  private static async setCache(cacheKey: string, value: string): Promise<void> {
    try { await redis.set(cacheKey, value, 'EX', this.REDIS_TTL); } catch { /* ignore */ }
  }

  private static async deleteCache(cacheKey: string): Promise<void> {
    try { await redis.del(cacheKey); } catch { /* ignore */ }
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
    const settings = await ds.getRepository(TenantSettingEntity).find({ where: { tenantId } });
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
    const setting = await ds.getRepository(TenantSettingEntity).findOne({ where: { tenantId, key } });
    if (!setting) return null;

    const parsed = SettingSchema.parse(setting);
    await this.setCache(cacheKey, JSON.stringify(parsed));
    return parsed;
  }

  static async getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (!Array.isArray(keys) || keys.length === 0) return result;

    const cacheKeys = keys.map(k => this.getCacheKey(tenantId, k));
    let cachedArr: (string | null)[] = [];
    try { cachedArr = await redis.mget(...cacheKeys); } catch { cachedArr = new Array(keys.length).fill(null); }

    const missingKeys: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const cached = cachedArr[i];
      if (cached) {
        try { result[keys[i]] = JSON.parse(cached).value; continue; } catch { /* fall through */ }
      }
      missingKeys.push(keys[i]);
    }

    if (missingKeys.length > 0) {
      const ds = await tenantDataSourceFor(tenantId);
      const settings = await ds.getRepository(TenantSettingEntity).find({
        where: { tenantId, key: In(missingKeys) },
      });
      for (const s of settings) {
        result[s.key] = s.value;
        await this.setCache(this.getCacheKey(tenantId, s.key), JSON.stringify(SettingSchema.parse(s)));
      }
    }

    return result;
  }

  static async getValue(tenantId: string, key: string): Promise<string | null> {
    const setting = await this.getByKey(tenantId, key);
    return setting?.value ?? null;
  }

  static async getValueWithFallback(tenantId: string, key: string): Promise<string | null> {
    const tenantValue = await this.getValue(tenantId, key);
    if (tenantValue !== null) return tenantValue;
    return SettingService.getValue(key);
  }

  static async create(tenantId: string, key: string, value: string, group?: string, type?: string): Promise<Setting> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSettingEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });

    let saved: TenantSettingEntity;
    if (existing) {
      await repo.update({ tenantId, key }, {
        value,
        ...(group && { group }),
        ...(type && { type }),
      });
      saved = (await repo.findOne({ where: { tenantId, key } }))!;
    } else {
      const entity = repo.create({ tenantId, key, value, group: group ?? 'general', type: type ?? 'string' });
      saved = await repo.save(entity);
    }

    const parsed = SettingSchema.parse(saved);
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsed));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async update(tenantId: string, key: string, value: string): Promise<Setting> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSettingEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (!existing) throw new Error('Setting not found');

    await repo.update({ tenantId, key }, { value });
    const updated = await repo.findOne({ where: { tenantId, key } });

    const parsed = SettingSchema.parse(updated!);
    await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsed));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async updateMany(tenantId: string, settings: Record<string, string>): Promise<Setting[]> {
    const updated: Setting[] = [];
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSettingEntity);

    for (const key in settings) {
      const existing = await repo.findOne({ where: { tenantId, key } });
      let saved: TenantSettingEntity;
      if (existing) {
        await repo.update({ tenantId, key }, { value: settings[key] });
        saved = (await repo.findOne({ where: { tenantId, key } }))!;
      } else {
        const entity = repo.create({ tenantId, key, value: settings[key], group: 'general', type: 'string' });
        saved = await repo.save(entity);
      }
      const parsed = SettingSchema.parse(saved);
      updated.push(parsed);
      await this.setCache(this.getCacheKey(tenantId, key), JSON.stringify(parsed));
    }

    await this.invalidateAllCache(tenantId);
    return updated;
  }

  static async delete(tenantId: string, key: string): Promise<Setting | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSettingEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (!existing) return null;

    const parsed = SettingSchema.parse(existing);
    await repo.delete({ tenantId, key });

    await this.deleteCache(this.getCacheKey(tenantId, key));
    await this.invalidateAllCache(tenantId);
    return parsed;
  }

  static async getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    const settings = await this.getAll(tenantId);
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
  }

  static async getByGroup(tenantId: string, group: string): Promise<Setting[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(TenantSettingEntity).find({ where: { tenantId, group } });
    return settings.map((s) => SettingSchema.parse(s));
  }

  static async clearCache(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const settings = await ds.getRepository(TenantSettingEntity).find({
      where: { tenantId },
      select: ['key'],
    });
    for (const s of settings) {
      await this.deleteCache(this.getCacheKey(tenantId, s.key));
    }
    await this.invalidateAllCache(tenantId);
  }
}
