// Publishes + installs every example community plugin under examples/@<scope>/<name>
// as a SANDBOXED contribution, each under its own vendor scope (@anthropic/claude,
// @sso/google, @invoice/de_zugferd, …). Tier/tags are derived from the contributed
// extension point. Migrates each plugin's legacy config into its namespace: AI API
// keys (legacy built-in setting or env override) into the encrypted secret, and any
// manifest-declared settings/secrets that still live under the same legacy tenant
// setting key (e.g. @invoice/* gateway URLs + tokens).
//
//   TARGET_TENANT_ID=<uuid> npm run seed:plugins
//   (optional key overrides: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY,
//    KIMI_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, META_API_KEY)
//
// Writes the marketplace rows directly (a tenant can self-service only ONE publisher
// via the UI, but the platform seed legitimately owns one publisher per vendor). It
// is wipe-and-recreate: it clears existing example listings/publishers + community
// install pointers first, so re-runs are clean. Encrypted plugin secrets are keyed
// by scoped name and survive (e.g. @kimi/kimi keeps its key). Requires DB + storage.

import 'reflect-metadata';
import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDataSource } from '@kuraykaraaslan/db';
import { Publisher } from '@kuraykaraaslan/marketplace/server/entities/publisher.entity';
import { PublishedModule } from '@kuraykaraaslan/marketplace/server/entities/published_module.entity';
import { PublishedModuleVersion } from '@kuraykaraaslan/marketplace/server/entities/published_module_version.entity';
import { installCommunity } from '@kuraykaraaslan/marketplace/server/community-install.service.next';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { encryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.join(here, '../examples');
const PUBLISHER_TENANT = process.env.PUBLISHER_TENANT_ID || ROOT_TENANT_ID;
const TARGET_TENANT = process.env.TARGET_TENANT_ID;

// provider key (manifest extension key) → (legacy built-in setting, env override)
const KEY_SOURCES: Record<string, { legacy?: string; env: string }> = {
  openai: { legacy: 'openaiApiKey', env: 'OPENAI_API_KEY' },
  anthropic: { legacy: 'anthropicApiKey', env: 'ANTHROPIC_API_KEY' },
  google: { legacy: 'googleAiApiKey', env: 'GOOGLE_AI_API_KEY' },
  kimi: { env: 'KIMI_API_KEY' },
  deepseek: { env: 'DEEPSEEK_API_KEY' },
  xai: { env: 'XAI_API_KEY' },
  meta: { env: 'META_API_KEY' },
};

interface Example { scope: string; product: string; dir: string; manifest: any; providerKey: string }

function discover(): Example[] {
  const out: Example[] = [];
  for (const scopeDir of readdirSync(EXAMPLES, { withFileTypes: true })) {
    if (!scopeDir.isDirectory() || !scopeDir.name.startsWith('@')) continue;
    const scope = scopeDir.name.slice(1);
    for (const nameDir of readdirSync(path.join(EXAMPLES, scopeDir.name), { withFileTypes: true })) {
      if (!nameDir.isDirectory()) continue;
      const dir = path.join(EXAMPLES, scopeDir.name, nameDir.name);
      if (!existsSync(path.join(dir, 'manifest.json')) || !existsSync(path.join(dir, 'plugin.js'))) continue;
      const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
      out.push({ scope, product: nameDir.name, dir, manifest, providerKey: manifest.extensions?.[0]?.key ?? nameDir.name });
    }
  }
  return out;
}

// Derive the listing tier/tags from the contributed extension point, so each
// family is labelled correctly (ai:provider→ai, invoice:adapter→invoice,
// payment:gateway→payment, auth_sso:provider→auth_sso, …) instead of all-AI.
function familyOf(manifest: any): { tier: string; tags: string[] } {
  const point = String(manifest.extensions?.[0]?.point ?? '');
  const [domain, kind] = point.split(':');
  if (!domain) return { tier: 'community', tags: ['community'] };
  return { tier: domain, tags: [domain, kind || 'plugin'] };
}

async function main() {
  const ds = await getDataSource();
  const pubRepo = ds.getRepository(Publisher);
  const listingRepo = ds.getRepository(PublishedModule);
  const versionRepo = ds.getRepository(PublishedModuleVersion);

  // Clean slate for the example set (re-runs are idempotent). Encrypted secrets
  // (plugin_secret:*) are NOT touched — they are keyed by scoped name and reused.
  await versionRepo.createQueryBuilder().delete().execute();
  await listingRepo.createQueryBuilder().delete().execute();
  await pubRepo.createQueryBuilder().delete().execute();
  if (TARGET_TENANT) await SettingService.deleteByPrefix(TARGET_TENANT, 'plugin.community.');

  const examples = discover();
  console.log(`seeding ${examples.length}: ${examples.map((e) => `@${e.scope}/${e.product}`).join(', ')}`);

  for (const e of examples) {
    // Publisher per vendor scope.
    let pub = await pubRepo.findOne({ where: { slug: e.scope } });
    if (!pub) {
      pub = await pubRepo.save(pubRepo.create({
        ownerTenantId: PUBLISHER_TENANT,
        slug: e.scope,
        displayName: e.manifest.name || e.scope,
        status: 'verified',
        verifiedAt: new Date(),
      }));
    }

    // Store the runnable bundle (ROOT-scoped, like submitVersion).
    const buffer = Buffer.from(readFileSync(path.join(e.dir, 'plugin.js'), 'utf8'));
    const scopedName = `@${e.scope}/${e.product}`;
    const stored = await StorageService.uploadServerBuffer(ROOT_TENANT_ID, {
      buffer,
      filename: `${scopedName.replace(/[^a-z0-9_.-]/gi, '_')}-${e.manifest.version}.js`,
      contentType: 'application/javascript',
      folder: 'plugin-bundles',
    });

    // Published listing + approved version.
    const family = familyOf(e.manifest);
    const listing = await listingRepo.save(listingRepo.create({
      publisherId: pub.publisherId,
      scopedName,
      moduleId: e.product,
      name: e.manifest.name,
      description: e.manifest.description ?? null,
      icon: e.manifest.icon ?? null,
      tier: family.tier,
      tags: family.tags,
      visibility: 'public',
      status: 'published',
    }));
    const version = await versionRepo.save(versionRepo.create({
      listingId: listing.listingId,
      version: e.manifest.version,
      manifestJson: JSON.stringify(e.manifest),
      bundleKey: stored.key,
      sandboxJson: e.manifest.sandbox ? JSON.stringify(e.manifest.sandbox) : null,
      reviewStatus: 'approved',
      reviewedAt: new Date(),
    }));
    listing.currentVersionId = version.versionId;
    await listingRepo.save(listing);
    console.log(`published ${scopedName}@${e.manifest.version} (key=${e.providerKey})`);

    if (!TARGET_TENANT) continue;
    await installCommunity(TARGET_TENANT, listing.listingId);

    const src = KEY_SOURCES[e.providerKey];
    let apiKey: string | null = null;
    if (src?.env && process.env[src.env]) apiKey = process.env[src.env]!;
    else if (src?.legacy) apiKey = await SettingService.getValue(TARGET_TENANT, src.legacy);
    if (apiKey) {
      await SettingService.updateMany(TARGET_TENANT, { [`plugin_secret:${scopedName}:apiKey`]: encryptFieldOpt(apiKey) });
      console.log(`  installed + migrated apiKey → ${scopedName}`);
    } else {
      console.log(`  installed (set credentials in Marketplace → Configure)`);
    }

    // Generic config migration: the manifest declares its non-secret settings and
    // secrets; for a full migration (e.g. @invoice/* gateways) the legacy values
    // lived under the SAME tenant setting key (zugferdGatewayUrl, cfdiPacToken, …).
    // Copy any that exist into the plugin namespace — settings plain, secrets
    // encrypted — so an upgrading tenant keeps its configuration.
    const cfg = e.manifest.config ?? {};
    const declaredSettings: Array<{ key: string }> = Array.isArray(cfg.settings) ? cfg.settings : [];
    const declaredSecrets: Array<{ key: string }> = Array.isArray(cfg.secrets) ? cfg.secrets : [];
    const migrated: Record<string, string> = {};
    for (const s of declaredSettings) {
      const v = await SettingService.getValue(TARGET_TENANT, s.key);
      if (v != null && v !== '') migrated[`plugin:${scopedName}:${s.key}`] = v;
    }
    for (const s of declaredSecrets) {
      if (s.key === 'apiKey') continue; // handled by the AI key migration above
      const v = await SettingService.getValue(TARGET_TENANT, s.key);
      if (v != null && v !== '') migrated[`plugin_secret:${scopedName}:${s.key}`] = encryptFieldOpt(v) as string;
    }
    if (Object.keys(migrated).length) {
      await SettingService.updateMany(TARGET_TENANT, migrated);
      console.log(`  migrated ${Object.keys(migrated).length} legacy config value(s) → ${scopedName}`);
    }
  }

  await SettingService.clearCache(TARGET_TENANT ?? PUBLISHER_TENANT);
  console.log('done.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
