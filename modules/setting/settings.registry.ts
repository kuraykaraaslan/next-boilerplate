import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ComponentType } from 'react';
import { SettingsTabProps, SettingsState } from './setting.types';

// ============================================================================
// Settings Tab Props (shared for both system and tenant)
// ============================================================================

export type TenantSettingsState = SettingsState;
export type TenantSettingsTabProps = SettingsTabProps;

// ============================================================================
// Common Types
// ============================================================================

export type ModuleType = 'system' | 'tenant' | 'both';

// ============================================================================
// Settings Tab Entry
// ============================================================================

export interface SettingsTabEntry {
  id: string;
  label: string;
  icon: IconDefinition;
  keys: readonly string[];
  component: ComponentType<SettingsTabProps>;
  order: number;
  type: ModuleType;
}

// ============================================================================
// Nav Menu Entry
// ============================================================================

export interface NavMenuEntry {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  order: number;
  type: ModuleType;
  children?: NavMenuEntry[];
}

// ============================================================================
// Module Config (combines all module exports)
// ============================================================================

export interface ModuleConfig {
  settingsTabs?: SettingsTabEntry[];
  menuItems?: NavMenuEntry[];
}

// ============================================================================
// Settings Helper Functions
// ============================================================================

export function getTabsSorted(tabs: SettingsTabEntry[]): SettingsTabEntry[] {
  return [...tabs].sort((a, b) => a.order - b.order);
}

export function getSystemTabs(tabs: SettingsTabEntry[]): SettingsTabEntry[] {
  return getTabsSorted(tabs.filter(tab => tab.type === 'system' || tab.type === 'both'));
}

export function getTenantTabs(tabs: SettingsTabEntry[]): SettingsTabEntry[] {
  return getTabsSorted(tabs.filter(tab => tab.type === 'tenant' || tab.type === 'both'));
}

export function getAllKeys(tabs: SettingsTabEntry[]): string[] {
  return tabs.flatMap(tab => [...tab.keys]);
}

// ============================================================================
// Menu Helper Functions
// ============================================================================

export function getMenuSorted(items: NavMenuEntry[]): NavMenuEntry[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function getSystemMenu(items: NavMenuEntry[]): NavMenuEntry[] {
  return getMenuSorted(items.filter(item => item.type === 'system' || item.type === 'both'));
}

export function getTenantMenu(items: NavMenuEntry[]): NavMenuEntry[] {
  return getMenuSorted(items.filter(item => item.type === 'tenant' || item.type === 'both'));
}

// ============================================================================
// Auto-Registry
// ============================================================================

const registeredTabs: SettingsTabEntry[] = [];
const registeredMenuItems: NavMenuEntry[] = [];

export function registerModule(config: ModuleConfig): void {
  if (config.settingsTabs) {
    registeredTabs.push(...config.settingsTabs);
  }
  if (config.menuItems) {
    registeredMenuItems.push(...config.menuItems);
  }
}

export function getRegisteredTabs(): SettingsTabEntry[] {
  return registeredTabs;
}

export function getRegisteredMenuItems(): NavMenuEntry[] {
  return registeredMenuItems;
}
