// ============================================================================
// Module System Types
// ============================================================================

import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// ============================================================================
// Scope Type
// ============================================================================

export type ModuleScope = 'system' | 'tenant' | 'both';

// ============================================================================
// Settings Tab
// ============================================================================

export interface SettingsTabJson {
  id: string;
  label: string;
  icon?: string;
  component: string;
  order?: number;
  scope?: ModuleScope;
  keys?: string | string[];
  permissions?: string[];
}

// ============================================================================
// Menu Item
// ============================================================================

export interface MenuItemJson {
  id: string;
  label: string;
  href: string;
  icon?: string;
  order?: number;
  scope?: ModuleScope;
  permissions?: string[];
  children?: MenuItemJson[];
  badge?: {
    type: 'count' | 'dot' | 'text';
    source: string;
  };
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: IconDefinition;
  order: number;
  scope: ModuleScope;
  permissions: string[];
  children?: MenuItem[];
  badge?: {
    type: 'count' | 'dot' | 'text';
    source: string;
  };
  moduleId: string;
}

// ============================================================================
// Route
// ============================================================================

export interface RouteJson {
  path: string;
  component: string;
  layout?: string;
  middleware?: string[];
  permissions?: string[];
}

// ============================================================================
// API Endpoint
// ============================================================================

export interface ApiEndpointJson {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: string;
  middleware?: string[];
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: string;
  };
}

// ============================================================================
// Permission
// ============================================================================

export interface Permission {
  id: string;
  name: string;
  description?: string;
  group?: string;
  moduleId: string;
}

// ============================================================================
// Widget
// ============================================================================

export interface WidgetJson {
  id: string;
  name?: string;
  component: string;
  scope?: ModuleScope;
  size?: 'small' | 'medium' | 'large' | 'full';
  order?: number;
  permissions?: string[];
}

// ============================================================================
// Module Hooks
// ============================================================================

export interface ModuleHooks {
  onInstall?: string;
  onUninstall?: string;
  onEnable?: string;
  onDisable?: string;
  onUpgrade?: string;
}

// ============================================================================
// Module Dependencies
// ============================================================================

export interface ModuleDependencies {
  requires?: string[];
  optional?: string[];
  conflicts?: string[];
}

// ============================================================================
// Module Configuration (JSON structure)
// ============================================================================

export interface ModuleJson {
  $schema?: string;
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  license?: string;
  icon?: string;
  tags?: string[];
  enabled?: boolean;
  priority?: number;
  dependencies?: ModuleDependencies;
  settings?: {
    tabs?: SettingsTabJson[];
    keys?: string;
  };
  menu?: MenuItemJson[];
  routes?: RouteJson[];
  api?: {
    endpoints?: ApiEndpointJson[];
    middleware?: string[];
  };
  permissions?: Array<{
    id: string;
    name: string;
    description?: string;
    group?: string;
  }>;
  hooks?: ModuleHooks;
  widgets?: WidgetJson[];
  exports?: Record<string, string>;
}
