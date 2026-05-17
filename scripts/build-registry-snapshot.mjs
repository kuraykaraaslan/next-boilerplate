#!/usr/bin/env node
// Builds offline AI-discoverable artifacts for next-boilerplate.
//
//   1. public/registry/registry.json        — full catalog (modules + routes + entities + components + conventions)
//   2. public/registry/registry.index.json  — lightweight index (no inlined README bodies)
//   3. public/registry/modules.json         — modules only (full, with README bodies)
//   4. public/registry/routes.json          — API route inventory
//   5. public/registry/entities.json        — TypeORM entity inventory
//   6. public/registry/components.json      — modules_next/ component + hook inventory
//   7. public/modules/<id>.md               — per-module markdown chunk (README + dependency info)
//   8. public/modules/_index.json           — { id → { tier, file } } map
//
// Pure Node — walks the filesystem and parses with conservative regex. No
// browser, no TS compiler. Re-run via `npm run registry:snapshot`.

import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const PKG_JSON_PATH       = path.join(REPO_ROOT, 'package.json');
const MODULES_DIR         = path.join(REPO_ROOT, 'modules');
const MODULES_NEXT_DIR    = path.join(REPO_ROOT, 'modules_next');
const APP_DIR             = path.join(REPO_ROOT, 'app');
const OUT_REGISTRY_DIR    = path.join(REPO_ROOT, 'public/registry');
const OUT_MODULES_DIR     = path.join(REPO_ROOT, 'public/modules');
const MODULES_MD_PATH     = path.join(REPO_ROOT, 'modules/MODULES.md');

// --- generic walkers ------------------------------------------------------

async function walk(dir, predicate, out = []) {
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, predicate, out);
    else if (e.isFile() && predicate(full, e.name)) out.push(full);
  }
  return out;
}

async function listDirs(dir) {
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return []; }
  return ents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
}

function rel(p) { return path.relative(REPO_ROOT, p).split(path.sep).join('/'); }

async function readJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return null; }
}

async function readText(p) {
  try { return await readFile(p, 'utf8'); }
  catch { return null; }
}

async function exists(p) {
  try { await stat(p); return true; }
  catch { return false; }
}

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
  audit_log: 'platform', api_key: 'platform',

  ai: 'ai',
};

// --- module collection ----------------------------------------------------

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

  let entries;
  try { entries = await readdir(moduleDir, { withFileTypes: true }); }
  catch { return out; }

  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.endsWith('.test.ts') || e.name.endsWith('.test.tsx')) continue;
    for (const [bucket, re] of FILE_BUCKETS) {
      if (re.test(e.name)) { out[bucket].push(e.name); break; }
    }
  }

  const entitiesDir = path.join(moduleDir, 'entities');
  if (await exists(entitiesDir)) {
    const ents = await readdir(entitiesDir);
    out.entities = ents.filter((n) => n.endsWith('.entity.ts'));
  }

  return out;
}

async function collectModules() {
  const ids = await listDirs(MODULES_DIR);
  const modules = [];
  for (const id of ids) {
    const dir = path.join(MODULES_DIR, id);
    const moduleJson = await readJson(path.join(dir, 'module.json'));
    const readme = await readText(path.join(dir, 'README.md'));
    const exports = await collectModuleExports(dir);
    const hasNextLayer = await exists(path.join(MODULES_NEXT_DIR, id));

    modules.push({
      id,
      name: moduleJson?.name ?? id,
      version: moduleJson?.version ?? '0.0.0',
      description: moduleJson?.description ?? '',
      dir: rel(dir),
      icon: moduleJson?.icon,
      tags: moduleJson?.tags ?? [],
      priority: moduleJson?.priority ?? 100,
      tier: TIER_BY_ID[id] ?? 'other',
      dependencies: moduleJson?.dependencies ?? { requires: [], optional: [], conflicts: [] },
      exports,
      hasReadme: !!readme,
      hasModuleJson: !!moduleJson,
      hasNextLayer,
      readme: readme ?? '',
    });
  }
  modules.sort((a, b) => (a.priority - b.priority) || a.id.localeCompare(b.id));
  return modules;
}

// --- route inventory ------------------------------------------------------

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function parseRouteMethods(source) {
  const found = new Set();
  for (const m of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`);
    if (re.test(source)) found.add(m);
  }
  return [...found];
}

function urlPathForRouteFile(routeFile) {
  // routeFile relative to /app, ending in /route.ts
  // app/system/api/users/route.ts            -> /system/api/users
  // app/tenant/[tenantId]/api/.../route.ts   -> /tenant/[tenantId]/api/...
  const r = rel(routeFile).replace(/^app\//, '').replace(/\/route\.ts$/, '');
  // Strip Next route groups like (group)/
  return '/' + r.split('/').filter((seg) => !(seg.startsWith('(') && seg.endsWith(')'))).join('/');
}

function moduleForRoute(urlPath) {
  // Heuristic: pull the segment after /api/ (skipping the "admin" gate
  // segment used by /system/api/admin/<thing>) and snake-case it. The
  // segment may already be pluralized (users -> user) so try both forms.
  const m = urlPath.match(/\/api\/(?:admin\/)?([^/[]+)/);
  if (!m) return undefined;
  const seg = m[1].replace(/-/g, '_');
  const singular = seg.endsWith('ies') ? seg.slice(0, -3) + 'y'
                 : seg.endsWith('s')   ? seg.slice(0, -1)
                 : seg;
  return MODULE_ID_ALIASES[seg] ?? MODULE_ID_ALIASES[singular] ?? singular;
}

const MODULE_ID_ALIASES = {
  users: 'user',
  tenants: 'tenant',
  payments: 'payment',
  coupons: 'coupon',
  webhooks: 'webhook',
  settings: 'setting',
  notifications: 'notification_inapp',
  sessions: 'user_session',
  'audit-logs': 'audit_log',
  audit_logs: 'audit_log',
  'api-keys': 'api_key',
  api_keys: 'api_key',
  'social-accounts': 'user_social_account',
  social_accounts: 'user_social_account',
  storage: 'storage',
  branding: 'tenant_branding',
  domains: 'tenant_domain',
  invitations: 'tenant_invitation',
  members: 'tenant_member',
  subscriptions: 'tenant_subscription',
  usage: 'tenant_usage',
  export: 'tenant_export',
  exports: 'tenant_export',
};

async function collectRoutes() {
  const files = await walk(APP_DIR, (full, name) => name === 'route.ts');
  const routes = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const urlPath = urlPathForRouteFile(file);
    const scope = urlPath.startsWith('/system') ? 'system'
                : urlPath.startsWith('/tenant') ? 'tenant'
                : 'system';
    routes.push({
      filePath: rel(file),
      scope,
      urlPath,
      methods: parseRouteMethods(src),
      module: moduleForRoute(urlPath),
      dynamic: /\[[^\]]+\]/.test(urlPath),
    });
  }
  routes.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
  return routes;
}

// --- entity inventory -----------------------------------------------------

function parseEntity(source, fallbackName) {
  const classM = source.match(/@Entity\s*\(([^)]*)\)\s*export\s+class\s+(\w+)/)
              ?? source.match(/export\s+class\s+(\w+)/);
  let name = fallbackName;
  let tableName;
  let schema = 'unknown';
  const ent = source.match(/@Entity\s*\(\s*(?:\{([^}]*)\}|['"]([^'"]+)['"])/);
  if (ent) {
    if (ent[2]) tableName = ent[2];
    if (ent[1]) {
      const nameM = ent[1].match(/name\s*:\s*['"]([^'"]+)['"]/);
      if (nameM) tableName = nameM[1];
      const schemaM = ent[1].match(/schema\s*:\s*['"]([^'"]+)['"]/);
      if (schemaM) schema = schemaM[1];
    }
  }
  if (classM) name = classM[classM.length - 1];

  const columns = [];
  const colRe = /@(?:Column|PrimaryGeneratedColumn|PrimaryColumn|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|VersionColumn)\b[\s\S]*?\n\s*([a-zA-Z_$][\w$]*)\s*[!?:]/g;
  let m;
  while ((m = colRe.exec(source)) !== null) columns.push(m[1]);

  const relations = [];
  const relRe = /@(?:ManyToOne|OneToMany|OneToOne|ManyToMany|JoinColumn|JoinTable)\b[\s\S]*?\n\s*([a-zA-Z_$][\w$]*)\s*[!?:]/g;
  while ((m = relRe.exec(source)) !== null) relations.push(m[1]);

  return { name, tableName, schema, columns: [...new Set(columns)], relations: [...new Set(relations)] };
}

async function collectEntities() {
  const files = await walk(MODULES_DIR, (full) => /\/entities\/[^/]+\.entity\.ts$/.test(full));
  const entities = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const fallback = path.basename(file).replace(/\.entity\.ts$/, '');
    const parsed = parseEntity(src, fallback);
    const moduleId = rel(file).split('/')[1];
    let schema = parsed.schema;
    if (schema === 'unknown') {
      schema = (moduleId.startsWith('tenant') || moduleId === 'audit_log' || moduleId === 'api_key' || moduleId === 'webhook')
        ? 'tenant'
        : 'system';
    }
    entities.push({
      name: parsed.name,
      filePath: rel(file),
      module: moduleId,
      schema,
      tableName: parsed.tableName,
      columns: parsed.columns,
      relations: parsed.relations,
    });
  }
  entities.sort((a, b) => a.name.localeCompare(b.name));
  return entities;
}

// --- modules_next component inventory ------------------------------------

function parseNamedExports(source) {
  const out = new Set();
  const re1 = /export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re1.exec(source)) !== null) out.add(m[1]);
  const re2 = /export\s*\{\s*([^}]+)\}/g;
  while ((m = re2.exec(source)) !== null) {
    for (const part of m[1].split(',')) {
      const id = part.trim().split(/\s+as\s+/).pop();
      if (id) out.add(id);
    }
  }
  return [...out];
}

function detectClientServer(source) {
  const first = source.trimStart().slice(0, 64);
  return {
    isClient: /^['"]use client['"]/.test(first),
    isServer: /^['"]use server['"]/.test(first),
  };
}

function kindForFile(file) {
  const r = rel(file);
  if (/\/ui\//.test(r))                return 'ui';
  if (/\/hooks\//.test(r))             return 'hook';
  if (/\.service\.next\.ts$/.test(r))  return 'service.next';
  if (/\/axios\//.test(r))             return 'axios';
  if (/\/utils\//.test(r))             return 'util';
  if (/module\.types\.ts$/.test(r))    return 'type';
  return 'ui';
}

async function collectComponents() {
  const files = await walk(MODULES_NEXT_DIR, (full, name) => {
    if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) return false;
    return name.endsWith('.ts') || name.endsWith('.tsx');
  });
  const components = [];
  for (const file of files) {
    const src = (await readText(file)) ?? '';
    const r = rel(file);
    const parts = r.split('/');
    const moduleId = parts[1];
    const baseName = path.basename(file).replace(/\.(ts|tsx)$/, '');
    const { isClient, isServer } = detectClientServer(src);
    components.push({
      id: `${moduleId}/${parts.slice(2).join('/').replace(/\.(ts|tsx)$/, '')}`,
      module: moduleId,
      filePath: r,
      kind: kindForFile(file),
      exports: parseNamedExports(src),
      isClient,
      isServer,
      baseName,
    });
  }
  components.sort((a, b) => a.id.localeCompare(b.id));
  return components;
}

// --- markdown chunks ------------------------------------------------------

function markdownForModule(mod, related) {
  const lines = [];
  lines.push(`# ${mod.name}`);
  lines.push('');
  lines.push(`- **id:** \`${mod.id}\``);
  lines.push(`- **tier:** ${mod.tier}`);
  lines.push(`- **version:** ${mod.version}`);
  lines.push(`- **dir:** \`${mod.dir}/\``);
  if (mod.tags?.length) lines.push(`- **tags:** ${mod.tags.join(', ')}`);
  if (mod.icon) lines.push(`- **icon:** \`${mod.icon}\``);
  lines.push(`- **hasNextLayer:** ${mod.hasNextLayer}`);
  lines.push('');
  if (mod.description) { lines.push(mod.description); lines.push(''); }

  const deps = mod.dependencies ?? {};
  if (deps.requires?.length || deps.optional?.length || deps.conflicts?.length) {
    lines.push('## Dependencies', '');
    if (deps.requires?.length)  lines.push(`- **requires:** ${deps.requires.map((d) => `\`${d}\``).join(', ')}`);
    if (deps.optional?.length)  lines.push(`- **optional:** ${deps.optional.map((d) => `\`${d}\``).join(', ')}`);
    if (deps.conflicts?.length) lines.push(`- **conflicts:** ${deps.conflicts.map((d) => `\`${d}\``).join(', ')}`);
    lines.push('');
  }

  const ex = mod.exports ?? {};
  const buckets = [
    ['Services',     ex.services],
    ['DTOs',         ex.dtos],
    ['Entities',     ex.entities],
    ['Enums',        ex.enums],
    ['Message keys', ex.messageKeys],
    ['Setting keys', ex.settingKeys],
    ['Providers',    ex.providers],
    ['Jobs',         ex.jobs],
  ];
  for (const [label, items] of buckets) {
    if (items?.length) {
      lines.push(`## ${label}`, '');
      for (const item of items) lines.push(`- \`${item}\``);
      lines.push('');
    }
  }

  if (related.routes.length) {
    lines.push('## Owned API routes', '');
    for (const r of related.routes) lines.push(`- \`${r.scope}\` ${r.methods.join('/')} \`${r.urlPath}\``);
    lines.push('');
  }
  if (related.entities.length) {
    lines.push('## TypeORM entities', '');
    for (const e of related.entities) lines.push(`- \`${e.name}\` (${e.schema}) — \`${e.filePath}\``);
    lines.push('');
  }
  if (related.components.length) {
    lines.push('## Next layer (modules_next/) surface', '');
    for (const c of related.components.slice(0, 60)) {
      const tags = [c.kind, c.isClient ? 'client' : null, c.isServer ? 'server' : null].filter(Boolean).join(', ');
      lines.push(`- \`${c.id}\` _(${tags})_`);
    }
    if (related.components.length > 60) lines.push(`- … and ${related.components.length - 60} more`);
    lines.push('');
  }

  if (mod.readme) {
    lines.push('## README', '', mod.readme.trim(), '');
  }

  return lines.join('\n');
}

// --- main -----------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  console.log('[snapshot] reading package.json …');
  const pkg = await readJson(PKG_JSON_PATH);

  console.log('[snapshot] collecting modules …');
  const modules = await collectModules();

  console.log('[snapshot] collecting routes …');
  const routes = await collectRoutes();

  console.log('[snapshot] collecting entities …');
  const entities = await collectEntities();

  console.log('[snapshot] collecting modules_next components …');
  const components = await collectComponents();

  const layers = {
    app:          'Next.js App Router — pages, layouts, route handlers. Thin glue importing both layers below.',
    modules_next: 'Next.js binding layer — React components, hooks, *.service.next.ts extensions. Imports modules/* + Next/React.',
    modules:      'Framework-agnostic business logic — services, DTOs, entities. No next/*, no react, no browser APIs.',
  };
  const conventions = {
    architecture: 'Three layers, strict one-way dependency: app/ -> modules_next/ -> modules/. modules/ NEVER imports modules_next/ or app/.',
    fileNaming:   '*.service.ts (logic), *.dto.ts (Zod), *.types.ts, *.enums.ts, *.messages.ts (i18n keys), *.setting.keys.ts, *.entity.ts (TypeORM), *.provider.ts (pluggable), *.job.ts (BullMQ), *.service.next.ts (Next-only extension), *.test.ts colocated.',
    scopes:       'Two URL scopes: system (super-admin, no tenant) under /system/... and tenant (per-tenant, resolved by proxy.ts) under /tenant/[tenantId]/.... Each has its own /admin, /api, /auth subtrees.',
    auth:         'JWT (httpOnly cookies), OTP, TOTP, SAML, OAuth (12+ providers via auth_sso), WebAuthn/Passkeys (user_security). Sessions: user_session (4 sub-services). Impersonation: always audited.',
    testing:      'Vitest + @testing-library/react. Tests colocated as *.test.ts / *.test.tsx beside the file under test. Run `npm test`.',
    security:     'Read SECURITY.md for the full threat model. Path alias is the single `@/*` -> `./*`. Multi-tenant data isolation enforced by per-tenant TypeORM DataSource (modules/db).',
  };

  const registry = {
    $schema: '/schemas/registry-v1.json',
    name: pkg?.name ?? 'next-boilerplate',
    version: pkg?.version ?? '0.0.0',
    registryVersion: '1.0',
    generatedAt: new Date().toISOString(),
    description: 'Production-grade multi-tenant SaaS starter on Next.js 16 with strict three-layer architecture.',
    layers,
    conventions,
    modules,
    routes,
    entities,
    components,
  };

  await rm(OUT_REGISTRY_DIR, { recursive: true, force: true });
  await rm(OUT_MODULES_DIR,  { recursive: true, force: true });
  await mkdir(OUT_REGISTRY_DIR, { recursive: true });
  await mkdir(OUT_MODULES_DIR,  { recursive: true });

  // Slim modules (drop README bodies) for the index variant.
  const slimModules = modules.map(({ readme, ...rest }) => rest);
  const indexRegistry = { ...registry, modules: slimModules };

  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.json'),       JSON.stringify(registry,      null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.index.json'), JSON.stringify(indexRegistry, null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'modules.json'),        JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, modules },    null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'routes.json'),         JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, routes },     null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'entities.json'),       JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, entities },   null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'components.json'),     JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, components }, null, 2) + '\n', 'utf8');

  // Per-module markdown chunks.
  const indexMap = {};
  for (const mod of modules) {
    const related = {
      routes:     routes.filter((r) => r.module === mod.id),
      entities:   entities.filter((e) => e.module === mod.id),
      components: components.filter((c) => c.module === mod.id),
    };
    const md = markdownForModule(mod, related);
    const file = `${mod.id}.md`;
    await writeFile(path.join(OUT_MODULES_DIR, file), md, 'utf8');
    indexMap[mod.id] = {
      name: mod.name,
      tier: mod.tier,
      tags: mod.tags,
      hasNextLayer: mod.hasNextLayer,
      routeCount: related.routes.length,
      entityCount: related.entities.length,
      componentCount: related.components.length,
      file,
    };
  }
  await writeFile(path.join(OUT_MODULES_DIR, '_index.json'), JSON.stringify(indexMap, null, 2) + '\n', 'utf8');

  const ms = Date.now() - t0;
  console.log(`[snapshot] wrote registry — ${modules.length} modules, ${routes.length} routes, ${entities.length} entities, ${components.length} components in ${ms}ms`);
}

main().catch((err) => {
  console.error('[snapshot] failed:', err.stack || err.message);
  process.exit(1);
});
