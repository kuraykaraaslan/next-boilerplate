// Move tenant-scope CLIENT admin pages into their owning module as
// ui/<name>.page.tsx and declare them in module.json `routes`. Pages keep their
// exact source (the catch-all hands them a params Promise), so this only moves
// files + colocated same-dir helpers, drops per-route layouts, and records the
// route. Server pages (no 'use client') and the keep-static set are skipped.
//
//   node scripts/_migrate/migrate-admin-pages.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const SCOPE_DIRS = [
  'app/tenant/[tenantId]/admin/(tenant-scope)',
  'app/tenant/[tenantId]/admin/(sysadmin-scope)',
];

const OWNER = {
  tenants: 'tenant', users: 'user', health: 'observability', fleet: 'observability',
  analytics: 'analytics', 'api-docs': 'api_doc', 'api-keys': 'api_key', approvals: 'approval',
  'audit-logs': 'audit_log', auth: 'auth', blocks: 'dynamic_page', blog: 'blog',
  consent: 'terms_consent', coupons: 'coupon', domains: 'tenant_domain',
  'feature-flags': 'feature_flags', 'gift-cards': 'gift_card', impersonation: 'auth_impersonation',
  integrations: 'integrations_hub', invitations: 'tenant_invitation', invoices: 'invoice',
  members: 'tenant_member', metering: 'metering', pages: 'dynamic_page', payments: 'payment',
  plans: 'payment', saml: 'auth_saml', search: 'search', settings: 'setting', sso: 'auth_sso',
  store: 'store', subscription: 'tenant_subscription', support: 'support', terms: 'terms_consent',
  wallet: 'wallet', webhooks: 'webhook',
};
const OVERRIDE = { '/admin/settings/branding': 'tenant_branding' };
const SKIP = new Set(['/admin/me', '/admin/modules']);

function kebab(s) {
  return s.replace(/\[|\]/g, '').replace(/\//g, '-')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-').toLowerCase();
}
const isClient = (file) => /^\s*['"]use client['"]/.test(fs.readFileSync(file, 'utf8'));

// find all page.tsx under the scope
function findPages(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findPages(p, acc);
    else if (e.name === 'page.tsx') acc.push(p);
  }
  return acc;
}

const moves = [];      // [from, to]
const deletes = [];    // layout/loading/error files
const routesByModule = {};
const skipped = [];

const allPages = SCOPE_DIRS.filter((d) => fs.existsSync(d)).flatMap((d) => findPages(d));
for (const pageFile of allPages) {
  const folder = path.dirname(pageFile);
  // admin path from folder, dropping the (tenant-scope) group segment
  const rel = path.relative('app/tenant/[tenantId]', folder).replace(/\((tenant|sysadmin)-scope\)\/?/, '');
  const adminPath = '/' + rel.replace(/\/$/, ''); // /admin/store/products/[productId]
  if (SKIP.has(adminPath)) { skipped.push([adminPath, 'keep-static']); continue; }
  if (!isClient(pageFile)) { skipped.push([adminPath, 'server']); continue; }

  const seg1 = adminPath.replace('/admin/', '').split('/')[0];
  const owner = OVERRIDE[adminPath] ?? OWNER[seg1];
  if (!owner) { skipped.push([adminPath, 'no-owner']); continue; }
  if (!fs.existsSync(path.join('modules', owner))) { skipped.push([adminPath, `no-module:${owner}`]); continue; }

  const name = kebab(adminPath.replace('/admin/', ''));
  const uiDir = path.join('modules', owner, 'ui');
  const dest = path.join(uiDir, `${name}.page.tsx`);
  moves.push([pageFile, dest]);

  // colocated same-dir helpers (not page/layout/loading/error) move alongside
  for (const e of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    if (['page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx'].includes(e.name)) {
      if (e.name !== 'page.tsx') deletes.push(path.join(folder, e.name));
      continue;
    }
    moves.push([path.join(folder, e.name), path.join(uiDir, e.name)]);
  }

  (routesByModule[owner] ??= []).push({ path: adminPath, component: `${owner}/ui/${name}.page` });
}

console.log(`Pages to migrate: ${moves.filter(([f]) => f.endsWith('page.tsx')).length}`);
console.log(`Files to move: ${moves.length}, layouts/loading to delete: ${deletes.length}`);
console.log(`Skipped: ${skipped.length}`);
skipped.forEach(([p, why]) => console.log(`  skip ${p} (${why})`));

if (!APPLY) {
  console.log('\n(dry-run) sample moves:');
  moves.slice(0, 10).forEach(([f, t]) => console.log(`  ${f} -> ${t}`));
  process.exit(0);
}

// collision guard
const dests = new Set();
for (const [, to] of moves) {
  if (dests.has(to) || fs.existsSync(to)) { console.error(`COLLISION: ${to}`); process.exit(1); }
  dests.add(to);
}

for (const f of deletes) fs.rmSync(f, { force: true });
for (const [from, to] of moves) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); }

// write manifest routes (merge, dedupe by path)
for (const [owner, routes] of Object.entries(routesByModule)) {
  const mf = path.join('modules', owner, 'module.json');
  const j = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const existing = Array.isArray(j.routes) ? j.routes : [];
  const seen = new Set(existing.map((r) => r.path));
  j.routes = [...existing, ...routes.filter((r) => !seen.has(r.path))];
  fs.writeFileSync(mf, JSON.stringify(j, null, 2) + '\n');
}

// remove now-empty app folders
function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) pruneEmpty(path.join(dir, e.name));
  }
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
SCOPE_DIRS.forEach(pruneEmpty);

console.log('Applied.');
