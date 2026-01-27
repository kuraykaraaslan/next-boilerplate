import SettingService from '@/modules/setting/setting.service';
import type { Setting } from '@/modules/setting/setting.types';

/**
 * TenantSettingService - Wrapper around SettingService for tenant-specific settings
 */
export default class TenantSettingService {

  static async getAll(tenantId: string): Promise<Setting[]> {
    return SettingService.getAll(tenantId);
  }

  static async getByKey(tenantId: string, key: string): Promise<Setting | null> {
    return SettingService.getByKey(key, tenantId);
  }

  static async getByKeys(tenantId: string, keys: string[]): Promise<Record<string, string>> {
    return SettingService.getByKeys(keys, tenantId);
  }

  static async getValue(tenantId: string, key: string): Promise<string | null> {
    return SettingService.getValue(key, tenantId);
  }

  static async getValueWithFallback(tenantId: string, key: string): Promise<string | null> {
    return SettingService.getValueWithFallback(key, tenantId);
  }

  static async create(
    tenantId: string,
    key: string,
    value: string,
    group?: string,
    type?: string
  ): Promise<Setting> {
    return SettingService.create(key, value, tenantId, group, type);
  }

  static async update(tenantId: string, key: string, value: string): Promise<Setting> {
    return SettingService.update(key, value, tenantId);
  }

  static async updateMany(tenantId: string, settings: Record<string, string>): Promise<Setting[]> {
    return SettingService.updateMany(settings, tenantId);
  }

  static async delete(tenantId: string, key: string): Promise<Setting | null> {
    return SettingService.delete(key, tenantId);
  }

  static async getAllAsRecord(tenantId: string): Promise<Record<string, string>> {
    return SettingService.getAllAsRecord(tenantId);
  }

  static async getByGroup(tenantId: string, group: string): Promise<Setting[]> {
    return SettingService.getByGroup(group, tenantId);
  }

  static async clearCache(tenantId: string): Promise<void> {
    return SettingService.clearCache(tenantId);
  }
}
