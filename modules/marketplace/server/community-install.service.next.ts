// Per-tenant install/activate/uninstall of community (third-party, sandboxed)
// plugins. Install just writes the markers the plugin runtime resolver reads
// (plugin.community.<listingId>.{version,active}); uninstall clears them AND purges
// the plugin's per-tenant data from plugin_kv. The plugin's code is never executed
// here — it runs only in the isolate via the dispatch route.

import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { PluginKv } from '@kuraykaraaslan/plugin_runtime/server/entities/plugin_kv.entity';
import { communityInstallKeys } from '@kuraykaraaslan/plugin_runtime/server/broker/install-keys';
import { PublishedModule } from './entities/published_module.entity';
import { PublishedModuleVersion } from './entities/published_module_version.entity';

async function loadRunnableListing(listingId: string): Promise<{ listing: PublishedModule; version: PublishedModuleVersion }> {
  const ds = await getDataSource();
  const listing = await ds.getRepository(PublishedModule).findOne({ where: { listingId } });
  if (!listing) throw new Error('Listing not found.');
  if (listing.status !== 'published' || !listing.currentVersionId) throw new Error('Listing is not published.');
  const version = await ds.getRepository(PublishedModuleVersion).findOne({ where: { versionId: listing.currentVersionId } });
  if (!version || version.reviewStatus !== 'approved') throw new Error('No approved version.');
  if (!version.bundleKey) throw new Error('This listing has no runnable bundle.');
  return { listing, version };
}

export async function installCommunity(tenantId: string, listingId: string, actorId?: string): Promise<void> {
  const { version } = await loadRunnableListing(listingId);
  await SettingService.updateMany(
    tenantId,
    { [communityInstallKeys.version(listingId)]: version.versionId, [communityInstallKeys.active(listingId)]: 'true' },
    actorId ? { actorId } : undefined,
  );
  await AuditLogService.log({
    tenantId, actorId: actorId ?? null, action: 'marketplace.community.install',
    resourceType: 'plugin', resourceId: listingId, metadata: { versionId: version.versionId },
  });
}

export async function setCommunityActive(tenantId: string, listingId: string, active: boolean, actorId?: string): Promise<void> {
  const current = await SettingService.getValue(tenantId, communityInstallKeys.version(listingId));
  if (!current) throw new Error('Plugin is not installed.');
  await SettingService.updateMany(tenantId, { [communityInstallKeys.active(listingId)]: String(active) }, actorId ? { actorId } : undefined);
  await AuditLogService.log({
    tenantId, actorId: actorId ?? null, action: active ? 'marketplace.community.activate' : 'marketplace.community.deactivate',
    resourceType: 'plugin', resourceId: listingId,
  });
}

export async function uninstallCommunity(tenantId: string, listingId: string, actorId?: string): Promise<{ rowsPurged: number }> {
  const ds = await getDataSource();
  const listing = await ds.getRepository(PublishedModule).findOne({ where: { listingId } });
  const pluginId = listing?.scopedName ?? null;

  // Clear install markers.
  await SettingService.deleteByPrefix(tenantId, `plugin.community.${listingId}.`, actorId ? { actorId } : undefined);

  // Purge the plugin's per-tenant data.
  let rowsPurged = 0;
  if (pluginId) {
    const tds = await tenantDataSourceFor(tenantId);
    const res = await tds.getRepository(PluginKv).delete({ tenantId, pluginId });
    rowsPurged = res.affected ?? 0;
  }
  await SettingService.clearCache(tenantId);
  await AuditLogService.log({
    tenantId, actorId: actorId ?? null, action: 'marketplace.community.uninstall',
    resourceType: 'plugin', resourceId: listingId, metadata: { rowsPurged },
  });
  return { rowsPurged };
}
