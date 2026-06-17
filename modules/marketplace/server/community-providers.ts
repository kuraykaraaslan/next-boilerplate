// Enumerate a tenant's installed+active+approved community plugins that contribute
// into a given host extension point (e.g. 'ai:provider'), reading the point key +
// metadata from the approved manifest. Returns the sandbox + bundle loader so a
// host-side facade can run the provider's ops in the isolate.

import { getDataSource } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { communityInstallKeys } from '@kuraykaraaslan/plugin_runtime/server/broker/install-keys';
import type { SandboxConfig } from '@kuraykaraaslan/plugin_runtime/server/rpc/protocol';
import { PublishedModuleVersion } from './entities/published_module_version.entity';
import { resolveRunnablePlugin } from './plugin-resolve';

export interface CommunityProviderContribution {
  listingId: string;
  point: string;
  key: string;
  label?: string;
  models: string[];
  sandbox: SandboxConfig;
  getBundle: () => Promise<string>;
}

const VERSION_KEY_RE = /^plugin\.community\.(.+)\.version$/;

export async function listInstalledCommunityProviders(tenantId: string, point: string): Promise<CommunityProviderContribution[]> {
  const all = await SettingService.getAllAsRecord(tenantId);
  const ds = await getDataSource();
  const out: CommunityProviderContribution[] = [];

  for (const [key, versionId] of Object.entries(all)) {
    const m = key.match(VERSION_KEY_RE);
    if (!m || !versionId) continue;
    const listingId = m[1];
    if (all[communityInstallKeys.active(listingId)] === 'false') continue;

    const runnable = await resolveRunnablePlugin(tenantId, listingId); // null if not approved/active/bundled
    if (!runnable) continue;

    const version = await ds.getRepository(PublishedModuleVersion).findOne({ where: { versionId } });
    if (!version) continue;
    let extensions: Array<{ point?: string; key?: string; metadata?: { label?: string; models?: string[] } }> = [];
    try { extensions = (JSON.parse(version.manifestJson).extensions ?? []); } catch { /* malformed */ }

    for (const ext of extensions) {
      if (ext.point !== point || !ext.key) continue;
      out.push({
        listingId,
        point,
        key: ext.key,
        label: ext.metadata?.label,
        models: ext.metadata?.models ?? [],
        sandbox: runnable.sandbox,
        getBundle: runnable.getBundle,
      });
    }
  }
  return out;
}
