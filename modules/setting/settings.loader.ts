// ============================================================================
// Settings & Menu Loader
// ============================================================================
// Provides filtered access to registered settings tabs and menu items.
// IMPORTANT: Import '@/modules/init' in your app entry point to register modules.

import {
  SettingsTabEntry,
  NavMenuEntry,
  getSystemTabs,
  getTenantTabs,
  getAllKeys,
  getSystemMenu,
  getTenantMenu,
  getRegisteredTabs,
  getRegisteredMenuItems,
} from './settings.registry';

// ============================================================================
// Settings Tabs
// ============================================================================

export function getSystemSettingsTabs(): SettingsTabEntry[] {
  return getSystemTabs(getRegisteredTabs());
}

export function getAllSystemKeys(): string[] {
  return getAllKeys(getSystemTabs(getRegisteredTabs()));
}

export function getTenantSettingsTabs(): SettingsTabEntry[] {
  return getTenantTabs(getRegisteredTabs());
}

export function getAllTenantKeys(): string[] {
  return getAllKeys(getTenantTabs(getRegisteredTabs()));
}

// ============================================================================
// Menu Items
// ============================================================================

export function getSystemMenuItems(): NavMenuEntry[] {
  return getSystemMenu(getRegisteredMenuItems());
}

export function getTenantMenuItems(tenantBase: string = ''): NavMenuEntry[] {
  const items = getTenantMenu(getRegisteredMenuItems());
  return items.map(item => ({
    ...item,
    href: item.href.replace('{tenantBase}', tenantBase),
  }));
}

// Re-export types
export type { TenantSettingsTabProps, SettingsTabEntry, NavMenuEntry } from './settings.registry';
