import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Setting as SettingEntity } from './entities/setting.entity';
import { SettingHistory } from './entities/setting_history.entity';
import { Setting } from './setting.types';
import SettingMessages from './setting.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { validateSettingValue } from './setting.validation';
import { getCacheKey, setCache, deleteCache } from './setting.cache';
import { encryptValue, parseRow } from './setting.crypto';

export async function recordHistory(
  tenantId: string,
  key: string,
  previousValue: string,
  newValue: string,
  changedByUserId?: string,
): Promise<void> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(SettingHistory).insert({
      tenantId,
      key,
      previousValue,
      newValue,
      changedByUserId,
    });
  } catch { /* best-effort */ }
}

export async function emitAuditLog(
  tenantId: string,
  action: string,
  key: string,
  actorId?: string,
): Promise<void> {
  try {
    const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
    await AuditLogService.log({
      tenantId,
      actorId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      action,
      resourceType: 'setting',
      resourceId: key,
    });
  } catch { /* best-effort */ }
}

export async function create(
  tenantId: string,
  key: string,
  value: string,
  group?: string,
  type?: string,
  options?: { actorId?: string; isLocked?: boolean },
): Promise<Setting> {
  validateSettingValue(key, value);
  const encrypted = encryptValue(key, value);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SettingEntity);
  const now = new Date();
  const existing = await repo.findOne({ where: { tenantId, key } });

  if (existing) {
    if (existing.isLocked) {
      throw new AppError(SettingMessages.SETTING_NOT_FOUND, 403, ErrorCode.FORBIDDEN);
    }
    await recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
    await repo.update({ tenantId, key }, { value: encrypted, group: group ?? existing.group, type: type ?? existing.type, updatedAt: now });
  } else {
    await repo.insert({
      tenantId, key, value: encrypted,
      group: group ?? 'general',
      type: type ?? 'string',
      isLocked: options?.isLocked ?? false,
      createdAt: now, updatedAt: now,
    });
  }
  const saved = await repo.findOne({ where: { tenantId, key } });
  const parsed = parseRow(saved!);
  await setCache(getCacheKey(tenantId, key), JSON.stringify(parsed));
  await deleteCache(getCacheKey(tenantId));
  await emitAuditLog(tenantId, 'setting.created', key, options?.actorId);
  return parsed;
}

export async function update(
  tenantId: string,
  key: string,
  value: string,
  options?: { actorId?: string },
): Promise<Setting> {
  validateSettingValue(key, value);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SettingEntity);
  const existing = await repo.findOne({ where: { tenantId, key } });
  if (!existing) throw new AppError(SettingMessages.SETTING_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (existing.isLocked) throw new AppError('Setting is locked and cannot be modified', 403, ErrorCode.FORBIDDEN);

  const encrypted = encryptValue(key, value);
  await recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
  await repo.update({ tenantId, key }, { value: encrypted, updatedAt: new Date() });
  const updated = await repo.findOne({ where: { tenantId, key } });
  const parsed = parseRow(updated!);
  await setCache(getCacheKey(tenantId, key), JSON.stringify(parsed));
  await deleteCache(getCacheKey(tenantId));
  await emitAuditLog(tenantId, 'setting.updated', key, options?.actorId);
  return parsed;
}

export async function updateMany(
  tenantId: string,
  settings: Record<string, string>,
  options?: { actorId?: string },
): Promise<Setting[]> {
  for (const [key, value] of Object.entries(settings)) validateSettingValue(key, value);

  const ds = await tenantDataSourceFor(tenantId);
  const now = new Date();

  const updatedSettings = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(SettingEntity);
    const result: Setting[] = [];
    for (const key in settings) {
      const value = settings[key];
      const encrypted = encryptValue(key, value);
      const existing = await repo.findOne({ where: { tenantId, key } });
      if (existing) {
        if (existing.isLocked) continue; // silently skip locked keys
        await recordHistory(tenantId, key, existing.value, encrypted, options?.actorId);
        await repo.update({ tenantId, key }, { value: encrypted, updatedAt: now });
      } else {
        await repo.insert({ tenantId, key, value: encrypted, group: 'general', type: 'string', createdAt: now, updatedAt: now });
      }
      const saved = await repo.findOne({ where: { tenantId, key } });
      result.push(parseRow(saved!));
    }
    return result;
  });

  for (const parsed of updatedSettings) {
    await setCache(getCacheKey(tenantId, parsed.key), JSON.stringify(parsed));
  }
  await deleteCache(getCacheKey(tenantId));
  await emitAuditLog(tenantId, 'setting.bulk_updated', Object.keys(settings).join(','), options?.actorId);
  return updatedSettings;
}

export async function remove(
  tenantId: string,
  key: string,
  options?: { actorId?: string },
): Promise<Setting | null> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SettingEntity);
  const setting = await repo.findOne({ where: { tenantId, key } });
  if (!setting) return null;
  if (setting.isLocked) throw new AppError('Setting is locked and cannot be deleted', 403, ErrorCode.FORBIDDEN);
  const parsed = parseRow(setting);
  await repo.delete({ tenantId, key });
  await deleteCache(getCacheKey(tenantId, key));
  await deleteCache(getCacheKey(tenantId));
  await emitAuditLog(tenantId, 'setting.deleted', key, options?.actorId);
  return parsed;
}
