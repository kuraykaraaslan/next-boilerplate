// Typed accessor over the generated `module-entities.json` (moduleId → its DB
// tables). Server-only, React-free — the marketplace uses it to know which tables
// a module owns, and which carry a `tenantId` column (the ones a per-tenant
// uninstall must purge). Mirrors how `module-registry` wraps `module-runtime.json`.

import data from './generated/module-entities.json';

export interface ModuleEntityInfo {
  tableName: string;
  /** Collector heuristic label ('tenant' | 'system'); not authoritative for purge. */
  schema: string;
  /** Authoritative purge signal: the table has a `tenantId` column. */
  hasTenantId: boolean;
}

const MODULES = (data as { modules: Record<string, ModuleEntityInfo[]> }).modules ?? {};

/** All tables owned by a module. */
export function getModuleEntities(moduleId: string): ModuleEntityInfo[] {
  return MODULES[moduleId] ?? [];
}

/** Tables that carry a `tenantId` column — purgeable per tenant. */
export function tenantTablesFor(moduleId: string): ModuleEntityInfo[] {
  return getModuleEntities(moduleId).filter((e) => e.hasTenantId);
}

/** Tables without a `tenantId` column — cannot be auto-purged per tenant. */
export function nonTenantTablesFor(moduleId: string): ModuleEntityInfo[] {
  return getModuleEntities(moduleId).filter((e) => !e.hasTenantId);
}
