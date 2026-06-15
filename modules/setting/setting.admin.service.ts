import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Setting as SettingEntity } from './entities/setting.entity';
import { SettingHistory } from './entities/setting_history.entity';
import { Setting } from './setting.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { decryptFieldOpt } from '@/modules/common/field-encryption';
import { getCacheKey, deleteCache } from './setting.cache';
import { update, updateMany } from './setting.write.service';

// ── Rollback: restore a previous value from history ──────────────────────
export async function rollback(
  tenantId: string,
  key: string,
  historyId: string,
  options?: { actorId?: string },
): Promise<Setting> {
  const ds = await tenantDataSourceFor(tenantId);
  const history = await ds.getRepository(SettingHistory).findOne({ where: { historyId, tenantId, key } });
  if (!history) throw new AppError('History record not found', 404, ErrorCode.NOT_FOUND);
  return update(tenantId, key, decryptFieldOpt(history.previousValue) ?? history.previousValue, options);
}

export async function getHistory(tenantId: string, key: string): Promise<SettingHistory[]> {
  const ds = await tenantDataSourceFor(tenantId);
  return ds.getRepository(SettingHistory).find({
    where: { tenantId, key },
    order: { createdAt: 'DESC' },
    take: 50,
  });
}

// ── Lock / unlock a setting (platform operators only) ─────────────────────
export async function setLocked(tenantId: string, key: string, isLocked: boolean): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.getRepository(SettingEntity).update({ tenantId, key }, { isLocked });
  await deleteCache(getCacheKey(tenantId, key));
  await deleteCache(getCacheKey(tenantId));
}

// ── Per-plan setting templates ───────────────────────────────────────────
// Apply a named template bundle to a tenant. Templates are defined in
// setting.templates.ts and keyed by plan slug (e.g. 'starter', 'pro', 'enterprise').
export async function applyTemplate(
  tenantId: string,
  templateName: string,
  options?: { actorId?: string },
): Promise<Setting[]> {
  const { SETTING_TEMPLATES } = await import('./setting.templates');
  const template = SETTING_TEMPLATES[templateName];
  if (!template) throw new AppError(`Unknown setting template: ${templateName}`, 400, ErrorCode.VALIDATION_ERROR);
  return updateMany(tenantId, template, options);
}
