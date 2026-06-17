// Marketplace-aware resolver: given a tenant + a community plugin (listingId),
// produce the SandboxConfig + a bundle loader for the plugin runtime. Enforces
// installed + active + approved. Lives in marketplace (which depends on the runtime),
// keeping the generic plugin_runtime free of any marketplace import.

import { getDataSource } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { loadRuntimeConfig, type SandboxConfig } from '@kuraykaraaslan/plugin_runtime/server/rpc/protocol';
import { communityInstallKeys } from '@kuraykaraaslan/plugin_runtime/server/broker/install-keys';
import type { Capability } from '@kuraykaraaslan/plugin_runtime/sdk/types';
import { PublishedModule } from './entities/published_module.entity';
import { PublishedModuleVersion } from './entities/published_module_version.entity';

export interface RunnablePlugin {
  sandbox: SandboxConfig;
  getBundle: () => Promise<string>;
}

/**
 * Resolve the runnable plugin for (tenantId, listingId), or null if it is not
 * installed / not active / not approved. `getBundle` is only invoked by the
 * host-client on a cold cache.
 */
export async function resolveRunnablePlugin(tenantId: string, listingId: string): Promise<RunnablePlugin | null> {
  const rec = await SettingService.getByKeys(tenantId, [communityInstallKeys.version(listingId), communityInstallKeys.active(listingId)]);
  const versionId = rec[communityInstallKeys.version(listingId)];
  if (!versionId) return null;                                  // not installed
  if (rec[communityInstallKeys.active(listingId)] === 'false') return null; // deactivated

  const ds = await getDataSource();
  const version = await ds.getRepository(PublishedModuleVersion).findOne({ where: { versionId } });
  if (!version || version.reviewStatus !== 'approved' || !version.bundleKey) return null;
  const listing = await ds.getRepository(PublishedModule).findOne({ where: { listingId } });
  if (!listing || listing.status !== 'published') return null;

  const defaults = loadRuntimeConfig().defaultLimits;
  let capabilities: Capability[] = [];
  let httpAllowlist: string[] = [];
  let limits = defaults;
  if (version.sandboxJson) {
    try {
      const s = JSON.parse(version.sandboxJson) as { capabilities?: Capability[]; httpAllowlist?: string[]; limits?: Partial<typeof defaults> };
      capabilities = s.capabilities ?? [];
      httpAllowlist = s.httpAllowlist ?? [];
      limits = { ...defaults, ...(s.limits ?? {}) };
    } catch { /* malformed sandbox → no capabilities */ }
  }

  const sandbox: SandboxConfig = {
    pluginVersionId: version.versionId,
    pluginId: listing.scopedName, // stable across versions; scopes plugin_kv/settings
    capabilities,
    httpAllowlist,
    limits,
  };

  const bundleKey = version.bundleKey;
  const getBundle = async (): Promise<string> => {
    const url = await StorageService.getPresignedUrl(ROOT_TENANT_ID, bundleKey, 120);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`failed to load plugin bundle (${res.status})`);
    return res.text();
  };

  return { sandbox, getBundle };
}
