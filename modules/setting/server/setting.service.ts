import 'reflect-metadata';
import type { Setting } from './setting.types';
import type { SettingHistory } from './entities/setting_history.entity';
import { clearCache } from './setting.cache';
import {
  getAll, getByKey, getByKeys, getValue, getAllAsRecord, getByGroup,
} from './setting.read.service';
import {
  create, update, updateMany, remove, removeByPrefix,
} from './setting.write.service';
import {
  rollback, getHistory, setLocked, applyTemplate,
} from './setting.admin.service';

/**
 * Setting service facade. The implementation is split across focused modules
 * (`setting.read.service`, `setting.write.service`, `setting.admin.service`,
 * plus the `setting.validation` / `setting.cache` / `setting.crypto` helpers);
 * this class preserves the single `SettingService.*` entry point its callers
 * depend on.
 */
export default class SettingService {
  static clearCache(tenantId: string): Promise<void> {
    return clearCache(tenantId);
  }

  static getAll(tenantId: string, masked = false): Promise<Setting[]> {
    return getAll(tenantId, masked);
  }

  static getByKey(tenantId: string, key: string, masked = false): Promise<Setting | null> {
    return getByKey(tenantId, key, masked);
  }

  static getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    return getByKeys(tenantId, keys);
  }

  static getValue(tenantId: string, key: string): Promise<string | null> {
    return getValue(tenantId, key);
  }

  static getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    return getAllAsRecord(tenantId);
  }

  static getByGroup(tenantId: string, group: string): Promise<Setting[]> {
    return getByGroup(tenantId, group);
  }

  static create(
    tenantId: string, key: string, value: string,
    group?: string, type?: string, options?: { actorId?: string; isLocked?: boolean },
  ): Promise<Setting> {
    return create(tenantId, key, value, group, type, options);
  }

  static update(tenantId: string, key: string, value: string, options?: { actorId?: string }): Promise<Setting> {
    return update(tenantId, key, value, options);
  }

  static updateMany(tenantId: string, settings: Record<string, string>, options?: { actorId?: string }): Promise<Setting[]> {
    return updateMany(tenantId, settings, options);
  }

  static delete(tenantId: string, key: string, options?: { actorId?: string }): Promise<Setting | null> {
    return remove(tenantId, key, options);
  }

  static deleteByPrefix(tenantId: string, prefix: string, options?: { actorId?: string }): Promise<number> {
    return removeByPrefix(tenantId, prefix, options);
  }

  static rollback(tenantId: string, key: string, historyId: string, options?: { actorId?: string }): Promise<Setting> {
    return rollback(tenantId, key, historyId, options);
  }

  static getHistory(tenantId: string, key: string): Promise<SettingHistory[]> {
    return getHistory(tenantId, key);
  }

  static setLocked(tenantId: string, key: string, isLocked: boolean): Promise<void> {
    return setLocked(tenantId, key, isLocked);
  }

  static applyTemplate(tenantId: string, templateName: string, options?: { actorId?: string }): Promise<Setting[]> {
    return applyTemplate(tenantId, templateName, options);
  }
}
