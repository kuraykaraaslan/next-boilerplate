// Runtime plugin registry. Reads the build-time `module-runtime.json` and
// filters menu items / slot contributions / widgets by enabled-module set,
// scope, and (optionally) the caller's permission set.
//
// This module is intentionally React-free so it can run on both server and
// client. It returns component *ids* (strings); resolving an id to an actual
// React component happens only in the client <Slot>/widget renderers via the
// generated `module-components` map.

import runtime from './generated/module-runtime.json';
import type { ModuleScope } from './module-manifest.types';

export interface RuntimeMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  order: number;
  scope: ModuleScope;
  group?: string;
  permissions: string[];
  badge?: { type: 'count' | 'dot' | 'text'; source: string };
  children?: RuntimeMenuItem[];
  moduleId: string;
}

export interface RuntimeSlotContribution {
  id: string;
  slot: string;
  componentId: string;
  order: number;
  scope: ModuleScope;
  permissions: string[];
  props: Record<string, unknown>;
  moduleId: string;
}

export interface RuntimeWidget {
  id: string;
  name?: string;
  componentId: string;
  order: number;
  scope: ModuleScope;
  size?: 'small' | 'medium' | 'large' | 'full';
  permissions: string[];
  moduleId: string;
}

export interface RuntimePageRoute {
  path: string;
  componentId: string;
  permissions: string[];
  moduleId: string;
}

export interface RuntimeApiRoute {
  path: string;
  handlerId: string;
  moduleId: string;
}

export interface RuntimeModule {
  id: string;
  name: string;
  icon?: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  license: string;
  tags: string[];
  priority: number;
  enabled: boolean;
  scope?: ModuleScope;
  tier?: string;
  /** Module ids this module depends on (manifest `dependencies.requires`). */
  requires: string[];
}

export interface RegistryFilter {
  /** Restrict to a URL scope; items with scope 'both' always match. */
  scope?: ModuleScope;
  /** Only include items whose module id is in this set. Omit to include all. */
  enabledIds?: Set<string>;
  /** The caller's permission set. Omit to skip permission gating entirely (v1 default). */
  permissions?: string[];
}

const MENU = runtime.menu as unknown as RuntimeMenuItem[];
const SLOTS = runtime.slots as unknown as RuntimeSlotContribution[];
const WIDGETS = runtime.widgets as unknown as RuntimeWidget[];
const MODULES = runtime.modules as unknown as RuntimeModule[];
const PAGE_ROUTES = (runtime.pageRoutes ?? []) as unknown as RuntimePageRoute[];
const API_ROUTES = (runtime.apiRoutes ?? []) as unknown as RuntimeApiRoute[];

/**
 * Match a request path against a list of routes by exact segment count, where a
 * `[param]` pattern segment matches any single segment and is captured. When
 * several routes match, the one with the fewest params (most literal) wins.
 */
function matchRoute<T extends { path: string }>(
  routes: T[],
  reqPath: string,
): { route: T; params: Record<string, string> } | undefined {
  const segs = reqPath.split('/').filter(Boolean);
  let best: T | undefined;
  let bestParams: Record<string, string> = {};
  let bestParamCount = Infinity;
  for (const r of routes) {
    const rsegs = r.path.split('/').filter(Boolean);
    if (rsegs.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    let paramCount = 0;
    for (let i = 0; i < rsegs.length; i++) {
      const rs = rsegs[i];
      if (rs.startsWith('[') && rs.endsWith(']')) {
        params[rs.slice(1, -1)] = segs[i];
        paramCount++;
      } else if (rs !== segs[i]) {
        ok = false;
        break;
      }
    }
    if (ok && paramCount < bestParamCount) {
      best = r;
      bestParams = params;
      bestParamCount = paramCount;
    }
  }
  return best ? { route: best, params: bestParams } : undefined;
}

function scopeMatches(itemScope: ModuleScope, want?: ModuleScope): boolean {
  if (!want) return true;
  return itemScope === 'both' || itemScope === want;
}

export function matchesFilter(
  item: { moduleId: string; scope: ModuleScope; permissions: string[] },
  f: RegistryFilter,
): boolean {
  if (f.enabledIds && !f.enabledIds.has(item.moduleId)) return false;
  if (!scopeMatches(item.scope, f.scope)) return false;
  // Permission gating only applies when the caller passes a permission set.
  if (f.permissions && item.permissions.length > 0) {
    const ok = item.permissions.every((p) => f.permissions!.includes(p));
    if (!ok) return false;
  }
  return true;
}

const byOrder = (a: { order: number; id: string }, b: { order: number; id: string }) =>
  a.order - b.order || a.id.localeCompare(b.id);

export const moduleRegistry = {
  /** All known modules (unfiltered), as recorded at build time. */
  getModules(): RuntimeModule[] {
    return MODULES;
  },

  getModule(id: string): RuntimeModule | undefined {
    return MODULES.find((m) => m.id === id);
  },

  /** Module ids this module directly depends on (manifest `dependencies.requires`). */
  getRequires(id: string): string[] {
    return this.getModule(id)?.requires ?? [];
  },

  isModuleEnabled(id: string, enabledIds?: Set<string>): boolean {
    if (enabledIds) return enabledIds.has(id);
    return this.getModule(id)?.enabled ?? false;
  },

  getMenuItems(filter: RegistryFilter = {}): RuntimeMenuItem[] {
    return MENU.filter((m) => matchesFilter(m, filter)).sort(byOrder);
  },

  getSlotContributions(slot: string, filter: RegistryFilter = {}): RuntimeSlotContribution[] {
    return SLOTS.filter((s) => s.slot === slot && matchesFilter(s, filter)).sort(byOrder);
  },

  getWidgets(filter: RegistryFilter = {}): RuntimeWidget[] {
    return WIDGETS.filter((w) => matchesFilter(w, filter)).sort(byOrder);
  },

  /** All manifest-declared admin page routes. */
  getPageRoutes(): RuntimePageRoute[] {
    return PAGE_ROUTES;
  },

  /**
   * The module page that serves an admin path. Matches manifest-declared `routes`
   * by exact segment count, where a `[param]` pattern segment matches any single
   * segment and is captured (e.g. route '/admin/store/products/[productId]'
   * matches '/admin/store/products/42' with params {productId: '42'}). When
   * several routes match, the one with the fewest params (most literal) wins.
   * Used by the catch-all dynamic admin route.
   */
  findPageRoute(adminPath: string): { route: RuntimePageRoute; params: Record<string, string> } | undefined {
    return matchRoute(PAGE_ROUTES, adminPath);
  },

  /** All manifest-declared tenant API routes. */
  getApiRoutes(): RuntimeApiRoute[] {
    return API_ROUTES;
  },

  /**
   * The module API handler that serves a tenant API path (e.g.
   * '/api/store/products/[productId]'), matched like findPageRoute. Used by the
   * catch-all API dispatcher.
   */
  findApiRoute(apiPath: string): { route: RuntimeApiRoute; params: Record<string, string> } | undefined {
    return matchRoute(API_ROUTES, apiPath);
  },
};

export type ModuleRegistryRuntime = typeof moduleRegistry;
