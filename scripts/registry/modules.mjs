// Module inventory — walks modules/<id>/ and collects manifest + exports.

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  MODULES_DIR, listDirs, rel, readJson, readText, exists,
} from './fs-utils.mjs';

// --- module tier classification ------------------------------------------

const TIER_BY_ID = {
  common: 'infrastructure', env: 'infrastructure', logger: 'infrastructure',
  redis: 'infrastructure', db: 'infrastructure', redis_idempotency: 'infrastructure',
  limiter: 'infrastructure', api_doc: 'infrastructure',

  user: 'identity', user_profile: 'identity', user_security: 'identity',
  user_preferences: 'identity', user_session: 'identity', user_social_account: 'identity',
  user_agent: 'identity', auth: 'identity', auth_sso: 'identity', auth_saml: 'identity',
  auth_impersonation: 'identity',

  tenant: 'tenancy', tenant_member: 'tenancy', tenant_invitation: 'tenancy',
  tenant_setting: 'tenancy', tenant_session: 'tenancy', tenant_branding: 'tenancy',
  tenant_domain: 'tenancy', tenant_subscription: 'tenancy', tenant_usage: 'tenancy',
  tenant_export: 'tenancy',

  notification_mail: 'notifications', notification_sms: 'notifications',
  notification_push: 'notifications', notification_inapp: 'notifications',

  payment: 'billing', coupon: 'billing',

  setting: 'platform', storage: 'platform', webhook: 'platform',
  audit_log: 'platform', api_key: 'platform', marketplace: 'platform',
  plugin_runtime: 'platform',

  ai: 'ai', ai_openai: 'ai', ai_anthropic: 'ai', ai_google: 'ai',
};

const FILE_BUCKETS = [
  ['services',    /\.service\.ts$/],
  ['dtos',        /\.dto\.ts$/],
  ['enums',       /\.enums\.ts$/],
  ['messageKeys', /\.messages\.ts$/],
  ['settingKeys', /\.setting\.keys\.ts$/],
  ['providers',   /\.provider\.ts$/],
  ['jobs',        /\.job\.ts$/],
];

async function collectModuleExports(moduleDir) {
  const out = { services: [], dtos: [], enums: [], messageKeys: [], settingKeys: [], providers: [], jobs: [], entities: [] };

  // Business-logic export buckets now live under modules/<id>/server/.
  const serverDir = path.join(moduleDir, 'server');

  let entries;
  try { entries = await readdir(serverDir, { withFileTypes: true }); }
  catch { return out; }

  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.endsWith('.test.ts') || e.name.endsWith('.test.tsx')) continue;
    for (const [bucket, re] of FILE_BUCKETS) {
      if (re.test(e.name)) { out[bucket].push(e.name); break; }
    }
  }

  const entitiesDir = path.join(serverDir, 'entities');
  if (await exists(entitiesDir)) {
    const ents = await readdir(entitiesDir);
    out.entities = ents.filter((n) => n.endsWith('.entity.ts'));
  }

  return out;
}

export async function collectModules() {
  const ids = await listDirs(MODULES_DIR);
  const modules = [];
  for (const id of ids) {
    const dir = path.join(MODULES_DIR, id);
    const moduleJson = await readJson(path.join(dir, 'module.json'));
    const packageJson = await readJson(path.join(dir, 'package.json'));
    const readme = await readText(path.join(dir, 'README.md'));
    const exports = await collectModuleExports(dir);
    // "next layer" now = presence of a ui/ or hooks/ folder in the package.
    const hasNextLayer =
      (await exists(path.join(dir, 'ui'))) || (await exists(path.join(dir, 'hooks')));

    modules.push({
      id,
      name: moduleJson?.name ?? id,
      version: moduleJson?.version ?? '0.0.0',
      description: moduleJson?.description ?? '',
      author: moduleJson?.author ?? '',
      license: moduleJson?.license ?? '',
      homepage: moduleJson?.homepage ?? '',
      dir: rel(dir),
      icon: moduleJson?.icon,
      tags: moduleJson?.tags ?? [],
      priority: moduleJson?.priority ?? 100,
      tier: TIER_BY_ID[id] ?? 'other',
      dependencies: moduleJson?.dependencies ?? { requires: [], optional: [], conflicts: [] },
      exports,
      // Plugin-runtime manifest surface (consumed by build-time codegen).
      enabled: moduleJson?.enabled ?? true,
      scope: moduleJson?.scope,
      menu: moduleJson?.menu ?? [],
      adminRoutes: moduleJson?.routes ?? [],
      apiRoutes: moduleJson?.apiRoutes ?? [],
      widgets: moduleJson?.widgets ?? [],
      slots: moduleJson?.slots ?? [],
      extensionPoints: moduleJson?.extensionPoints ?? [],
      extensions: moduleJson?.extensions ?? [],
      // package.json `exports` keys (e.g. './server/x.route') — used to validate
      // that an extension's `export` is actually published by its module.
      pkgExports: packageJson?.exports ? Object.keys(packageJson.exports) : [],
      settingsTabs: moduleJson?.settings?.tabs ?? [],
      modulePermissions: moduleJson?.permissions ?? [],
      hasReadme: !!readme,
      hasModuleJson: !!moduleJson,
      hasNextLayer,
      readme: readme ?? '',
    });
  }
  modules.sort((a, b) => (a.priority - b.priority) || a.id.localeCompare(b.id));
  return modules;
}
