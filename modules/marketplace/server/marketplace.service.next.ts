// Marketplace service: per-tenant install / activate / deactivate / uninstall of
// feature modules. "Installed" = a ModuleInstall row exists; "active" = the
// `module.<id>.enabled` setting is on (reuses the existing activation system, so
// there is a single source of truth for active/inactive). Uninstall purges the
// module's per-tenant rows from every table that carries a `tenantId` column.

import { moduleRegistry } from '@kuraykaraaslan/common/server/module-registry';
import {
  getEnabledModuleIds,
  setModuleEnabled,
  isProtectedModule,
  listModulesWithState,
  type ModuleState,
} from '@kuraykaraaslan/setting/server/module-activation.service.next';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import {
  tenantTablesFor as tenantTables,
  nonTenantTablesFor as nonTenantTables,
} from '@kuraykaraaslan/common/server/module-entities';
import { ModuleInstall } from './entities/module_install.entity';

export interface CatalogEntry extends ModuleState {
  /** A ModuleInstall row exists for this tenant. */
  installed: boolean;
  installedAt: string | null;
  installedVersion: string | null;
}

/** Module is a marketplace item iff it is non-protected (protected = always-on infra). */
function isMarketplaceModule(id: string): boolean {
  return !isProtectedModule(id) && !!moduleRegistry.getModule(id);
}

/**
 * Transitive `requires` closure of a module, restricted to non-protected feature
 * modules (protected infra is always-on and never needs installing). Excludes the
 * module itself.
 */
export function resolveRequiresClosure(moduleId: string): string[] {
  const out = new Set<string>();
  const stack = [...moduleRegistry.getRequires(moduleId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id) || id === moduleId) continue;
    if (isProtectedModule(id)) continue; // always-on; not a marketplace dep
    if (!moduleRegistry.getModule(id)) continue; // unknown/dangling — skip
    out.add(id);
    stack.push(...moduleRegistry.getRequires(id));
  }
  return [...out];
}

/** Installed + active modules whose requires-closure includes `moduleId`. */
async function activeDependents(tenantId: string, moduleId: string): Promise<string[]> {
  const installed = await installedIds(tenantId);
  const enabled = await getEnabledModuleIds(tenantId);
  return [...installed].filter(
    (id) => id !== moduleId && enabled.has(id) && resolveRequiresClosure(id).includes(moduleId),
  );
}

async function installedIds(tenantId: string): Promise<Set<string>> {
  const ds = await tenantDataSourceFor(tenantId);
  const rows = await ds.getRepository(ModuleInstall).find({ where: { tenantId }, select: ['moduleId'] });
  return new Set(rows.map((r) => r.moduleId));
}

/** Catalog of installable modules with per-tenant install + active state. */
export async function listCatalog(tenantId: string): Promise<CatalogEntry[]> {
  const states = await listModulesWithState(tenantId);
  const ds = await tenantDataSourceFor(tenantId);
  const installs = await ds.getRepository(ModuleInstall).find({ where: { tenantId } });
  const byId = new Map(installs.map((i) => [i.moduleId, i]));
  return states
    .filter((m) => isMarketplaceModule(m.id))
    .map((m) => {
      const row = byId.get(m.id);
      return {
        ...m,
        installed: !!row,
        installedAt: row ? row.installedAt.toISOString() : null,
        installedVersion: row ? row.version : null,
      };
    });
}

/** Tenant-owned tables (carry a tenantId column) for a module, for purge/preview. */
export function tenantTablesFor(moduleId: string): { tableName: string; schema: string }[] {
  return tenantTables(moduleId).map((e) => ({ tableName: e.tableName, schema: e.schema }));
}

/** Module tables that have NO tenantId column — cannot be auto-purged per tenant. */
export function nonTenantTablesFor(moduleId: string): string[] {
  return nonTenantTables(moduleId).map((e) => e.tableName);
}

export interface DeletePreview {
  moduleId: string;
  tenantTables: string[];
  skippedTables: string[];
  dependents: string[];
}

export async function previewDelete(tenantId: string, moduleId: string): Promise<DeletePreview> {
  return {
    moduleId,
    tenantTables: tenantTablesFor(moduleId).map((t) => t.tableName),
    skippedTables: nonTenantTablesFor(moduleId),
    dependents: await activeDependents(tenantId, moduleId),
  };
}

/**
 * Install a module (and its non-protected required deps): write ModuleInstall
 * rows and enable each. Idempotent — re-installing just ensures rows + enabled.
 */
export async function install(tenantId: string, moduleId: string, actorId?: string): Promise<void> {
  if (!isMarketplaceModule(moduleId)) {
    throw new Error(`Module "${moduleId}" is not an installable marketplace module.`);
  }
  const targets = [moduleId, ...resolveRequiresClosure(moduleId)];
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ModuleInstall);
  for (const id of targets) {
    const mod = moduleRegistry.getModule(id);
    if (!mod) continue;
    const existing = await repo.findOne({ where: { tenantId, moduleId: id } });
    if (!existing) {
      await repo.save(repo.create({ tenantId, moduleId: id, version: mod.version }));
    }
    await setModuleEnabled(tenantId, id, true, actorId);
  }
  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: 'marketplace.install',
    resourceType: 'module',
    resourceId: moduleId,
    metadata: { installed: targets },
  });
}

/** Activate (enable) or deactivate (disable, keep data) an installed module. */
export async function setActive(
  tenantId: string,
  moduleId: string,
  active: boolean,
  actorId?: string,
): Promise<void> {
  if (!isMarketplaceModule(moduleId)) throw new Error(`Unknown marketplace module: ${moduleId}`);
  const installed = await installedIds(tenantId);
  if (!installed.has(moduleId)) throw new Error(`Module "${moduleId}" is not installed.`);
  if (!active) {
    const deps = await activeDependents(tenantId, moduleId);
    if (deps.length) {
      throw new Error(`Cannot deactivate "${moduleId}" — still required by: ${deps.join(', ')}.`);
    }
  }
  await setModuleEnabled(tenantId, moduleId, active, actorId);
  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: active ? 'marketplace.activate' : 'marketplace.deactivate',
    resourceType: 'module',
    resourceId: moduleId,
  });
}

/**
 * Uninstall a module for a tenant and PURGE its data: delete every row scoped to
 * this tenant from the module's tenantId-bearing tables, clear `module.<id>.*`
 * settings, and remove the ModuleInstall row. Blocked if active modules still
 * depend on it (unless `cascade`, which uninstalls the dependents first).
 */
export async function purge(
  tenantId: string,
  moduleId: string,
  actorId?: string,
  cascade = false,
): Promise<{ tablesPurged: string[]; rowsDeleted: number; skippedTables: string[] }> {
  if (!isMarketplaceModule(moduleId)) throw new Error(`Unknown marketplace module: ${moduleId}`);

  const deps = await activeDependents(tenantId, moduleId);
  if (deps.length && !cascade) {
    throw new Error(`Cannot delete "${moduleId}" — still required by: ${deps.join(', ')}. Pass cascade to remove them too.`);
  }
  // Cascade: uninstall dependents first (deepest first is unnecessary — each purge
  // re-checks remaining dependents).
  if (cascade) {
    for (const dep of deps) {
      // eslint-disable-next-line no-await-in-loop
      await purge(tenantId, dep, actorId, true);
    }
  }

  const tables = tenantTablesFor(moduleId);
  const skippedTables = nonTenantTablesFor(moduleId);
  const ds = await tenantDataSourceFor(tenantId);

  let rowsDeleted = 0;
  const tablesPurged: string[] = [];
  await ds.transaction(async (mgr) => {
    // Defer FK checks so intra-module parent/child delete order does not matter.
    try { await mgr.query('SET CONSTRAINTS ALL DEFERRED'); } catch { /* non-PG or no deferrable FKs */ }
    for (const t of tables) {
      const meta = ds.entityMetadatas.find((m) => m.tableName === t.tableName);
      if (!meta) continue; // table not mapped to a registered entity — skip safely
      const res = await mgr
        .createQueryBuilder()
        .delete()
        .from(meta.target)
        .where('"tenantId" = :tid', { tid: tenantId })
        .execute();
      rowsDeleted += res.affected ?? 0;
      tablesPurged.push(t.tableName);
    }
  });

  // Clear the module's settings (enabled flag + any per-module config keys).
  await SettingService.deleteByPrefix(tenantId, `module.${moduleId}.`, actorId ? { actorId } : undefined);
  await SettingService.clearCache(tenantId);

  // Remove the install record.
  await ds.getRepository(ModuleInstall).delete({ tenantId, moduleId });

  await AuditLogService.log({
    tenantId,
    actorId: actorId ?? null,
    action: 'marketplace.delete',
    resourceType: 'module',
    resourceId: moduleId,
    metadata: { tablesPurged, rowsDeleted, skippedTables, cascadeDependents: cascade ? deps : [] },
  });

  return { tablesPurged, rowsDeleted, skippedTables };
}
