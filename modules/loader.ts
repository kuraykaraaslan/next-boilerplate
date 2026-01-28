// ============================================================================
// Module Loader
// ============================================================================
// Loads and resolves modules from their JSON configurations

import {
  ModuleJson,
  ModuleScope,
  SettingsTab,
  MenuItem,
  Permission,
  LoadedModule,
} from './module.types';
import { getEnabledModules, getModulePath, isModuleEnabled as checkModuleEnabled, getModuleById } from './registry';
import { getIcon } from './setting/icons.registry';
import { getComponent } from './setting/components.registry';
import { getKeys } from './setting/keys.registry';

// ============================================================================
// Module Resolution
// ============================================================================

function resolveSettingsTabs(module: ModuleJson, modulePath: string): SettingsTab[] {
  if (!module.settings?.tabs) return [];

  return module.settings.tabs
    .map(tab => {
      const component = getComponent(modulePath, tab.component);
      if (!component) {
        console.warn(`[${module.id}] Component not found: ${tab.component}`);
        return null;
      }

      return {
        id: tab.id,
        label: tab.label,
        icon: getIcon(tab.icon || 'faCog'),
        component,
        order: tab.order ?? 100,
        scope: (tab.scope || 'system') as ModuleScope,
        keys: getKeys(tab.keys || []),
        permissions: tab.permissions || [],
        moduleId: module.id,
      };
    })
    .filter((tab): tab is SettingsTab => tab !== null);
}

function resolveMenuItems(module: ModuleJson): MenuItem[] {
  if (!module.menu) return [];

  const resolveItem = (item: any): MenuItem => ({
    id: item.id,
    label: item.label,
    href: item.href,
    icon: item.icon ? getIcon(item.icon) : undefined,
    order: item.order ?? 100,
    scope: (item.scope || 'system') as ModuleScope,
    permissions: item.permissions || [],
    children: item.children?.map(resolveItem),
    badge: item.badge,
    moduleId: module.id,
  });

  return module.menu.map(resolveItem);
}

function resolvePermissions(module: ModuleJson): Permission[] {
  if (!module.permissions) return [];

  return module.permissions.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    group: p.group,
    moduleId: module.id,
  }));
}

function loadModule(moduleJson: ModuleJson): LoadedModule {
  const modulePath = getModulePath(moduleJson.id);

  return {
    id: moduleJson.id,
    name: moduleJson.name,
    description: moduleJson.description || '',
    version: moduleJson.version,
    author: moduleJson.author || '',
    license: moduleJson.license || '',
    icon: moduleJson.icon ? getIcon(moduleJson.icon) : undefined,
    tags: moduleJson.tags || [],
    enabled: moduleJson.enabled !== false,
    priority: moduleJson.priority ?? 100,
    path: modulePath,
    dependencies: moduleJson.dependencies || {},
    settingsTabs: resolveSettingsTabs(moduleJson, modulePath),
    menuItems: resolveMenuItems(moduleJson),
    permissions: resolvePermissions(moduleJson),
    widgets: [], // TODO: implement widgets
  };
}

// ============================================================================
// Cached Data
// ============================================================================

let _loadedModules: LoadedModule[] | null = null;

function getLoadedModules(): LoadedModule[] {
  if (!_loadedModules) {
    _loadedModules = getEnabledModules().map(loadModule);
  }
  return _loadedModules;
}

// ============================================================================
// Public API - Modules
// ============================================================================

export function getAllModules(): LoadedModule[] {
  return getLoadedModules();
}

export function getModule(id: string): LoadedModule | undefined {
  return getLoadedModules().find(m => m.id === id);
}

export function isModuleEnabled(id: string): boolean {
  return checkModuleEnabled(id);
}

export function getModulesByTag(tag: string): LoadedModule[] {
  return getLoadedModules().filter(m => m.tags.includes(tag));
}

// ============================================================================
// Public API - Settings Tabs
// ============================================================================

export function getAllSettingsTabs(): SettingsTab[] {
  return getLoadedModules()
    .flatMap(m => m.settingsTabs)
    .sort((a, b) => a.order - b.order);
}

export function getSettingsTabs(scope: ModuleScope): SettingsTab[] {
  return getAllSettingsTabs().filter(
    tab => tab.scope === scope || tab.scope === 'both'
  );
}

export function getSystemSettingsTabs(): SettingsTab[] {
  return getSettingsTabs('system');
}

export function getTenantSettingsTabs(): SettingsTab[] {
  return getSettingsTabs('tenant');
}

export function getAllSystemKeys(): string[] {
  return getSystemSettingsTabs().flatMap(tab => [...tab.keys]);
}

export function getAllTenantKeys(): string[] {
  return getTenantSettingsTabs().flatMap(tab => [...tab.keys]);
}

// ============================================================================
// Public API - Menu Items
// ============================================================================

export function getAllMenuItems(): MenuItem[] {
  return getLoadedModules()
    .flatMap(m => m.menuItems)
    .sort((a, b) => a.order - b.order);
}

export function getMenuItems(scope: ModuleScope): MenuItem[] {
  return getAllMenuItems().filter(
    item => item.scope === scope || item.scope === 'both'
  );
}

export function getSystemMenuItems(): MenuItem[] {
  return getMenuItems('system');
}

export function getTenantMenuItems(tenantBase: string = ''): MenuItem[] {
  const items = getMenuItems('tenant');

  const replaceHref = (item: MenuItem): MenuItem => ({
    ...item,
    href: item.href.replace('{tenantBase}', tenantBase),
    children: item.children?.map(replaceHref),
  });

  return items.map(replaceHref);
}

// ============================================================================
// Public API - Permissions
// ============================================================================

export function getAllPermissions(): Permission[] {
  return getLoadedModules().flatMap(m => m.permissions);
}

export function getPermissionsByGroup(group: string): Permission[] {
  return getAllPermissions().filter(p => p.group === group);
}

export function getPermissionGroups(): string[] {
  const groups = new Set(getAllPermissions().map(p => p.group).filter(Boolean));
  return Array.from(groups) as string[];
}

// ============================================================================
// Dependency Checking
// ============================================================================

export function checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
  const moduleJson = getModuleById(moduleId);
  if (!moduleJson?.dependencies?.requires) {
    return { satisfied: true, missing: [] };
  }

  const missing = moduleJson.dependencies.requires.filter(dep => !checkModuleEnabled(dep));
  return { satisfied: missing.length === 0, missing };
}

export function getModuleDependents(moduleId: string): string[] {
  return getEnabledModules()
    .filter(m => m.dependencies?.requires?.includes(moduleId))
    .map(m => m.id);
}

// ============================================================================
// Re-exports for compatibility
// ============================================================================

export type { SettingsTab, MenuItem, Permission, LoadedModule, ModuleScope } from './module.types';
