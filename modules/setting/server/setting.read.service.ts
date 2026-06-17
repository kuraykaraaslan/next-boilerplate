import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { ROOT_TENANT_ID, isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { Setting as SettingEntity } from './entities/setting.entity';
import { Setting } from './setting.types';
import redis from '@kuraykaraaslan/redis';
import { getCacheKey, getFromCache, setCache, deleteCache } from './setting.cache';
import { decryptValue, parseRow } from './setting.crypto';

// ── Platform default → tenant override inheritance ───────────────────────
// When a tenant doesn't have a key, fall back to the ROOT_TENANT_ID default.
async function resolveValue(tenantId: string, key: string): Promise<SettingEntity | null> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds.getRepository(SettingEntity).findOne({ where: { tenantId, key } });
  if (row) return row;
  if (isRootTenant(tenantId)) return null;
  // Fallback to platform default
  const rootDs = await tenantDataSourceFor(ROOT_TENANT_ID);
  return rootDs.getRepository(SettingEntity).findOne({ where: { tenantId: ROOT_TENANT_ID, key } });
}

export async function getAll(tenantId: string, masked = false): Promise<Setting[]> {
  const cacheKey = getCacheKey(tenantId);
  const cached = await getFromCache(cacheKey);
  if (cached && !masked) {
    try { return JSON.parse(cached); } catch { await deleteCache(cacheKey); }
  }
  const ds = await tenantDataSourceFor(tenantId);
  const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId } });
  const parsed = settings.map((s) => parseRow(s, masked));
  if (!masked) await setCache(cacheKey, JSON.stringify(parsed));
  return parsed;
}

export async function getByKey(tenantId: string, key: string, masked = false): Promise<Setting | null> {
  const cacheKey = getCacheKey(tenantId, key);
  const cached = await getFromCache(cacheKey);
  if (cached && !masked) {
    try { return JSON.parse(cached); } catch { await deleteCache(cacheKey); }
  }
  const row = await resolveValue(tenantId, key);
  if (!row) return null;
  const parsed = parseRow(row, masked);
  if (!masked) await setCache(cacheKey, JSON.stringify(parsed));
  return parsed;
}

export async function getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!keys.length) return result;

  const cacheKeys = keys.map((k) => getCacheKey(tenantId, k));
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
    const rows = await ds.getRepository(SettingEntity).find({ where: { tenantId, key: In(missingKeys) } });
    for (const r of rows) {
      const decrypted = decryptValue(r.key, r.value);
      result[r.key] = decrypted;
      const parsed = parseRow(r);
      await setCache(getCacheKey(tenantId, r.key), JSON.stringify(parsed));
    }
    // Fall back to root defaults for keys still missing
    const foundKeys = new Set(rows.map((r) => r.key));
    const stillMissing = missingKeys.filter((k) => !foundKeys.has(k));
    if (stillMissing.length > 0 && !isRootTenant(tenantId)) {
      const rootDs = await tenantDataSourceFor(ROOT_TENANT_ID);
      const rootRows = await rootDs.getRepository(SettingEntity).find({
        where: { tenantId: ROOT_TENANT_ID, key: In(stillMissing) },
      });
      for (const r of rootRows) {
        result[r.key] = decryptValue(r.key, r.value);
      }
    }
  }
  return result;
}

export async function getValue(tenantId: string, key: string): Promise<string | null> {
  return (await getByKey(tenantId, key))?.value ?? null;
}

export async function getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
  const settings = await getAll(tenantId);
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function getByGroup(tenantId: string, group: string): Promise<Setting[]> {
  const ds = await tenantDataSourceFor(tenantId);
  const settings = await ds.getRepository(SettingEntity).find({ where: { tenantId, group } });
  return settings.map((s) => parseRow(s));
}
