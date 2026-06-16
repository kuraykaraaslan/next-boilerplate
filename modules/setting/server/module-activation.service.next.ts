// Per-tenant module enable/disable state, stored in the shared key-value
// `settings` table under `module.<id>.enabled`. Absent key falls back to the
// module's manifest `enabled` default. App-store-friendly: an installer simply
// writes these keys (plus, later, an installed/version key).

import SettingService from './setting.service';
import { moduleRegistry } from '@nb/common/server/module-registry';

const KEY = (id: string) => `module.${id}.enabled`;

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
  enabled: boolean;
}

export async function listModulesWithState(tenantId: string): Promise<ModuleState[]> {
  const enabled = await getEnabledModuleIds(tenantId);
  return moduleRegistry
    .getModules()
    .map((m) => ({ id: m.id, name: m.name, icon: m.icon, tier: m.tier, enabled: enabled.has(m.id) }))
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
  await SettingService.updateMany(
    tenantId,
    { [KEY(id)]: String(enabled) },
    actorId ? { actorId } : undefined,
  );
}
