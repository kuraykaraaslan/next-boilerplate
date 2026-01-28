// ============================================================================
// Settings Loader (Legacy Compatibility)
// ============================================================================
// Re-exports from the new module loader for backward compatibility.
// New code should import from '@/modules/loader'

export {
  getSystemSettingsTabs,
  getTenantSettingsTabs,
  getAllSystemKeys,
  getAllTenantKeys,
  getSystemMenuItems,
  getTenantMenuItems,
  isModuleEnabled,
  getAllModules as getEnabledModules,
} from '../loader';

// Legacy type exports - map new types to old names
export type { SettingsTab as SettingsTabEntry } from '../loader';
export type { MenuItem as NavMenuEntry } from '../loader';
export type { TenantSettingsTabProps } from './settings.registry';
