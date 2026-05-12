import { ComponentType } from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ModuleScope, MenuItem, Permission } from '@/modules/module.types';

export type { ModuleScope, MenuItem, Permission };

// ============================================================================
// Settings Tab (runtime)
// ============================================================================

export interface SettingsTab {
  id: string;
  label: string;
  icon: IconDefinition;
  component: ComponentType<any>;
  order: number;
  scope: ModuleScope;
  keys: readonly string[];
  permissions: string[];
  moduleId: string;
}

// ============================================================================
// Route (runtime)
// ============================================================================

export interface Route {
  path: string;
  component: ComponentType<any>;
  layout?: string;
  middleware: string[];
  permissions: string[];
  moduleId: string;
}

// ============================================================================
// Widget (runtime)
// ============================================================================

export interface Widget {
  id: string;
  name: string;
  component: ComponentType<any>;
  scope: ModuleScope;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
  permissions: string[];
  moduleId: string;
}

// ============================================================================
// Loaded Module (runtime)
// ============================================================================

export interface LoadedModule {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  icon?: IconDefinition;
  tags: string[];
  enabled: boolean;
  priority: number;
  path: string;
  dependencies: import('@/modules/module.types').ModuleDependencies;
  settingsTabs: SettingsTab[];
  menuItems: MenuItem[];
  permissions: Permission[];
  widgets: Widget[];
}

// ============================================================================
// Module Registry
// ============================================================================

export interface ModuleRegistry {
  modules: Map<string, LoadedModule>;
  getModule(id: string): LoadedModule | undefined;
  getEnabledModules(): LoadedModule[];
  isModuleEnabled(id: string): boolean;
  getSettingsTabs(scope?: ModuleScope): SettingsTab[];
  getMenuItems(scope?: ModuleScope): MenuItem[];
  getPermissions(): Permission[];
  getWidgets(scope?: ModuleScope): Widget[];
}
