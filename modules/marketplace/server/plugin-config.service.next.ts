// Generic per-tenant configuration for ANY installed community plugin. A plugin
// declares its tunables once in its manifest `config` block:
//
//   "config": {
//     "settings": [{ "key": "region", "label": "Region", "help": "…" }],
//     "secrets":  [{ "key": "apiKey", "label": "API Key", "help": "…" }]
//   }
//
// Settings are stored plaintext under `plugin:<scopedName>:<key>` (the same
// namespace the sandbox broker reads); secrets are encrypted under
// `plugin_secret:<scopedName>:<key>` and are write-only (never returned). One
// service + one route backs every plugin's settings — no per-feature plumbing.

import { getDataSource } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { encryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { communityInstallKeys } from '@kuraykaraaslan/plugin_runtime/server/broker/install-keys';
import { PublishedModule } from './entities/published_module.entity';
import { PublishedModuleVersion } from './entities/published_module_version.entity';

export interface PluginFieldDecl {
  key: string;
  label?: string;
  help?: string;
  placeholder?: string;
}

interface PluginManifestConfig {
  settings?: PluginFieldDecl[];
  secrets?: PluginFieldDecl[];
}

/** Setting key for a plugin's non-secret setting (mirrors the broker's SETTING_PREFIX). */
function settingKey(scopedName: string, key: string): string {
  return `plugin:${scopedName}:${key}`;
}
/** Setting key for a plugin's encrypted secret (mirrors the broker's SECRET_PREFIX). */
function secretKey(scopedName: string, key: string): string {
  return `plugin_secret:${scopedName}:${key}`;
}

/** Load the tenant's installed + approved version manifest for a listing. */
async function loadInstalledManifest(
  tenantId: string,
  listingId: string,
): Promise<{ scopedName: string; name: string; icon: string | null; config: PluginManifestConfig } | null> {
  const versionId = await SettingService.getValue(tenantId, communityInstallKeys.version(listingId));
  if (!versionId) return null; // not installed for this tenant
  const ds = await getDataSource();
  const version = await ds.getRepository(PublishedModuleVersion).findOne({ where: { versionId } });
  if (!version || version.reviewStatus !== 'approved') return null;
  const listing = await ds.getRepository(PublishedModule).findOne({ where: { listingId } });
  if (!listing) return null;
  let config: PluginManifestConfig = {};
  try { config = (JSON.parse(version.manifestJson).config ?? {}) as PluginManifestConfig; } catch { /* malformed */ }
  return { scopedName: listing.scopedName, name: listing.name, icon: listing.icon, config };
}

export interface PluginConfigView {
  listingId: string;
  scopedName: string;
  name: string;
  icon: string | null;
  /** Non-secret settings with their current values. */
  settings: Array<PluginFieldDecl & { value: string }>;
  /** Secrets with set-status only — values are never returned. */
  secrets: Array<PluginFieldDecl & { set: boolean }>;
  /** True when every declared secret is set. */
  configured: boolean;
}

/** Current config (declared fields + values/set-status) for an installed plugin. */
export async function getPluginConfig(tenantId: string, listingId: string): Promise<PluginConfigView | null> {
  const m = await loadInstalledManifest(tenantId, listingId);
  if (!m) return null;
  const settingDecls = m.config.settings ?? [];
  const secretDecls = m.config.secrets ?? [];

  const settingVals = settingDecls.length
    ? await SettingService.getByKeys(tenantId, settingDecls.map((s) => settingKey(m.scopedName, s.key)))
    : {};
  const settings = settingDecls.map((s) => ({ ...s, value: settingVals[settingKey(m.scopedName, s.key)] ?? '' }));

  const secretVals = secretDecls.length
    ? await SettingService.getByKeys(tenantId, secretDecls.map((s) => secretKey(m.scopedName, s.key)))
    : {};
  const secrets = secretDecls.map((s) => {
    const v = secretVals[secretKey(m.scopedName, s.key)];
    return { ...s, set: typeof v === 'string' && v.length > 0 };
  });

  return {
    listingId,
    scopedName: m.scopedName,
    name: m.name,
    icon: m.icon,
    settings,
    secrets,
    configured: secrets.every((s) => s.set),
  };
}

/**
 * Persist a plugin's config. Only declared keys are accepted; empty secret values
 * are ignored (blank = keep existing). Returns the refreshed view.
 */
export async function setPluginConfig(
  tenantId: string,
  listingId: string,
  input: { settings?: Record<string, unknown>; secrets?: Record<string, unknown> },
  actorId?: string,
): Promise<PluginConfigView | null> {
  const m = await loadInstalledManifest(tenantId, listingId);
  if (!m) return null;
  const allowedSettings = new Set((m.config.settings ?? []).map((s) => s.key));
  const allowedSecrets = new Set((m.config.secrets ?? []).map((s) => s.key));

  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.settings ?? {})) {
    if (!allowedSettings.has(k)) continue;
    patch[settingKey(m.scopedName, k)] = v == null ? '' : String(v);
  }
  const secretsSet: string[] = [];
  for (const [k, v] of Object.entries(input.secrets ?? {})) {
    if (!allowedSecrets.has(k)) continue;
    if (typeof v !== 'string' || v.length === 0) continue; // blank keeps existing
    // encryptFieldOpt: encrypts when SETTINGS_ENCRYPTION_KEY is set, stores
    // plaintext in dev when it isn't — same policy as other sensitive settings.
    patch[secretKey(m.scopedName, k)] = encryptFieldOpt(v);
    secretsSet.push(k);
  }

  if (Object.keys(patch).length > 0) {
    await SettingService.updateMany(tenantId, patch, actorId ? { actorId } : undefined);
    await SettingService.clearCache(tenantId);
    await AuditLogService.log({
      tenantId,
      actorId: actorId ?? null,
      action: 'marketplace.community.plugin.configure',
      resourceType: 'plugin',
      resourceId: listingId,
      metadata: { settings: Object.keys(input.settings ?? {}).filter((k) => allowedSettings.has(k)), secretsSet },
    });
  }

  return getPluginConfig(tenantId, listingId);
}
