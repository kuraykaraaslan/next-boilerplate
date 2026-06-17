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

export interface ProviderSecretDecl {
  key: string;
  label?: string;
}

export interface CommunityProviderContribution {
  listingId: string;
  point: string;
  key: string;
  label?: string;
  models: string[];
  /** Raw manifest extension metadata (label, models, protocol, country, …). */
  metadata: Record<string, unknown>;
  /** Stable plugin id (scoped name) that namespaces this plugin's secrets/settings. */
  scopedName: string;
  /** Secrets the plugin declares as required (manifest extension metadata.secrets). */
  secrets: ProviderSecretDecl[];
  sandbox: SandboxConfig;
  getBundle: () => Promise<string>;
}

const VERSION_KEY_RE = /^plugin\.community\.(.+)\.version$/;

/** Full settings key under which a plugin secret is stored (mirrors the broker). */
export function pluginSecretKey(scopedName: string, secretKey: string): string {
  return `plugin_secret:${scopedName}:${secretKey}`;
}

/** Whether a plugin secret is set (non-empty) for a tenant — never returns the value. */
export async function isPluginSecretSet(tenantId: string, scopedName: string, secretKey: string): Promise<boolean> {
  const v = await SettingService.getValue(tenantId, pluginSecretKey(scopedName, secretKey));
  return typeof v === 'string' && v.length > 0;
}

/** True when every secret the provider declares is set for the tenant. */
export async function providerIsConfigured(tenantId: string, c: CommunityProviderContribution): Promise<boolean> {
  for (const s of c.secrets) {
    if (!(await isPluginSecretSet(tenantId, c.scopedName, s.key))) return false;
  }
  return true;
}

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
    let manifest: { extensions?: Array<{ point?: string; key?: string; metadata?: Record<string, unknown> }>; config?: { secrets?: ProviderSecretDecl[] } } = {};
    try { manifest = JSON.parse(version.manifestJson); } catch { /* malformed */ }
    const declaredSecrets = Array.isArray(manifest.config?.secrets) ? manifest.config!.secrets! : [];

    for (const ext of manifest.extensions ?? []) {
      if (ext.point !== point || !ext.key) continue;
      const metadata = ext.metadata ?? {};
      out.push({
        listingId,
        point,
        key: ext.key,
        label: typeof metadata.label === 'string' ? metadata.label : undefined,
        models: Array.isArray(metadata.models) ? (metadata.models as string[]) : [],
        metadata,
        scopedName: runnable.sandbox.pluginId,
        secrets: declaredSecrets,
        sandbox: runnable.sandbox,
        getBundle: runnable.getBundle,
      });
    }
  }
  return out;
}
