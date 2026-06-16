// Move tenant API route handlers from app/tenant/[tenantId]/api/<path>/route.ts
// into their owning module as server/<name>.route.ts, declared in module.json
// `apiRoutes` and served by the catch-all dispatcher. Handlers move VERBATIM
// (they keep `export async function GET(req, { params })`); the dispatcher hands
// them a params Promise. Skips cron, streaming/special-config routes, and any
// route importing React/ui (those stay as file routes alongside the catch-all).
//
//   node scripts/_migrate/migrate-api-routes.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const API = 'app/tenant/[tenantId]/api';

const OWNER = {
  auth: 'auth', store: 'store', 'dynamic-pages': 'dynamic_page', webhooks: 'webhook',
  integrations: 'integrations_hub', invoices: 'invoice', payments: 'payment',
  subscription: 'tenant_subscription', scim: 'scim', agreements: 'terms_consent', ai: 'ai',
  'api-keys': 'api_key', 'audit-logs': 'audit_log', blog: 'blog', conversations: 'messaging',
  plans: 'payment', wallet: 'wallet', coupons: 'coupon', 'feature-flags': 'feature_flags',
  'gift-cards': 'gift_card', metering: 'metering', tenants: 'tenant', invitations: 'tenant_invitation',
  messaging: 'messaging', users: 'user', analytics: 'analytics', consent: 'terms_consent',
  domains: 'tenant_domain', 'media-gallery': 'media_gallery', settings: 'setting',
  storefront: 'store', support: 'support', admin: 'setting', approvals: 'approval',
  checkout: 'payment', members: 'tenant_member', notifications: 'notification_inapp',
  search: 'search', seo: 'seo', 'admin-settings': 'setting', 'e-signature': 'e_signature',
  export: 'tenant_export', health: 'observability', modules: 'setting', saml: 'auth_saml',
  storage: 'storage',
};
const SKIP_SEG = new Set(['cron']);

function kebab(s) {
  return s.replace(/\[|\]/g, '').replace(/\//g, '-')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-').toLowerCase();
}
function findRoutes(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findRoutes(p, acc);
    else if (e.name === 'route.ts') acc.push(p);
  }
  return acc;
}

const moves = [];
const routesByModule = {};
const skipped = [];

for (const file of findRoutes(API)) {
  const sub = path.relative(API, path.dirname(file)); // store/products/[productId]
  const apiPath = '/api/' + sub;
  const seg1 = sub.split('/')[0];
  const src = fs.readFileSync(file, 'utf8');

  if (SKIP_SEG.has(seg1)) { skipped.push([apiPath, 'cron']); continue; }
  if (/export const (runtime|dynamic|revalidate|maxDuration)\b/.test(src)) { skipped.push([apiPath, 'special-config']); continue; }
  if (/@nb\/[a-z_]+\/ui|from ['"]react['"]/.test(src)) { skipped.push([apiPath, 'react-import']); continue; }
  const owner = OWNER[seg1];
  if (!owner) { skipped.push([apiPath, 'no-owner']); continue; }
  if (!fs.existsSync(path.join('modules', owner))) { skipped.push([apiPath, `no-module:${owner}`]); continue; }

  const name = kebab(sub);
  const handlerId = `${owner}/server/${name}.route`;
  const dest = path.join('modules', owner, 'server', `${name}.route.ts`);
  moves.push([file, dest]);
  (routesByModule[owner] ??= []).push({ path: apiPath, handler: handlerId });
}

console.log(`API routes to migrate: ${moves.length}`);
console.log(`Skipped: ${skipped.length}`);
const bySkip = {};
skipped.forEach(([, w]) => (bySkip[w] = (bySkip[w] || 0) + 1));
console.log('  ' + Object.entries(bySkip).map(([k, v]) => `${k}:${v}`).join(', '));

if (!APPLY) {
  console.log('\n(dry-run) sample:');
  moves.slice(0, 8).forEach(([f, t]) => console.log(`  ${f} -> ${t}`));
  process.exit(0);
}

const dests = new Set();
for (const [, to] of moves) {
  if (dests.has(to) || fs.existsSync(to)) { console.error(`COLLISION: ${to}`); process.exit(1); }
  dests.add(to);
}
for (const [from, to] of moves) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); }

for (const [owner, routes] of Object.entries(routesByModule)) {
  const mf = path.join('modules', owner, 'module.json');
  const j = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const existing = Array.isArray(j.apiRoutes) ? j.apiRoutes : [];
  const seen = new Set(existing.map((r) => r.path));
  j.apiRoutes = [...existing, ...routes.filter((r) => !seen.has(r.path))];
  fs.writeFileSync(mf, JSON.stringify(j, null, 2) + '\n');
}

function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) pruneEmpty(path.join(dir, e.name));
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
pruneEmpty(API);

console.log('Applied.');
