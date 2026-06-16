// Per-tenant module enable/disable state, stored in the shared key-value
// `settings` table under `module.<id>.enabled`. Absent key falls back to the
// module's manifest `enabled` default. App-store-friendly: an installer simply
// writes these keys (plus, later, an installed/version key).

import SettingService from './setting.service';
import { moduleRegistry } from '@nb/common/server/module-registry';

const KEY = (id: string) => `module.${id}.enabled`;

// Core modules that keep the admin, auth and tenancy working. They cannot be
// disabled — otherwise a tenant could lock itself out of this very screen.
const PROTECTED = new Set([
  'common', 'db', 'env', 'logger', 'redis', 'limiter',
  'setting', 'auth', 'user', 'user_session', 'tenant', 'tenant_session', 'tenant_member',
]);

export function isProtectedModule(id: string): boolean {
  return PROTECTED.has(id);
}

export async function getEnabledModuleIds(tenantId: string): Promise<Set<string>> {
  const mods = moduleRegistry.getModules();
  const rec = await SettingService.getByKeys(tenantId, mods.map((m) => KEY(m.id)));
  const enabled = new Set<string>();
  for (const m of mods) {
    const v = rec[KEY(m.id)];
    const on = v === undefined ? m.enabled !== false : v === 'true';
    if (on) enabled.add(m.id);
  }
  return enabled;
}

export interface ModuleState {
  id: string;
  name: string;
  icon?: string;
  tier?: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  license: string;
  tags: string[];
  enabled: boolean;
  protected: boolean;
}

export async function listModulesWithState(tenantId: string): Promise<ModuleState[]> {
  const enabled = await getEnabledModuleIds(tenantId);
  return moduleRegistry
    .getModules()
    .map((m) => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      tier: m.tier,
      version: m.version,
      description: m.description,
      author: m.author,
      homepage: m.homepage,
      license: m.license,
      tags: m.tags,
      enabled: enabled.has(m.id),
      protected: PROTECTED.has(m.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function setModuleEnabled(
  tenantId: string,
  id: string,
  enabled: boolean,
  actorId?: string,
): Promise<void> {
  if (!moduleRegistry.getModule(id)) {
    throw new Error(`Unknown module: ${id}`);
  }
  if (!enabled && PROTECTED.has(id)) {
    throw new Error(`Module "${id}" is a core module and cannot be disabled.`);
  }
  await SettingService.updateMany(
    tenantId,
    { [KEY(id)]: String(enabled) },
    actorId ? { actorId } : undefined,
  );
}
