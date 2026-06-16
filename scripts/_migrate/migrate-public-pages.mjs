// Move public auth pages + the public api-docs page into their modules as
// ui/<name>.page.tsx and declare them in module.json `routes`. Auth pages are
// served by app/.../auth/[...slug] (under the shared auth layout); api-docs by
// the extended tenant-root [...slug] catch-all. Verbatim moves (pages keep
// `({ params }) => use(params)`). Run with --apply.
//
//   node scripts/_migrate/migrate-public-pages.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const T = 'app/tenant/[tenantId]';

function kebab(s) {
  return s.replace(/\[|\]/g, '').replace(/\//g, '-')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-').toLowerCase();
}
function findPages(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === '[...slug]') continue; findPages(p, acc); }
    else if (e.name === 'page.tsx') acc.push(p);
  }
  return acc;
}

const moves = [];
const deletes = [];
const routesByModule = {};

// --- auth pages -> auth module ---
for (const pageFile of findPages(path.join(T, 'auth'))) {
  const sub = path.relative(path.join(T, 'auth'), path.dirname(pageFile)); // e.g. "login"
  const name = kebab(sub);
  const dest = path.join('modules', 'auth', 'ui', `${name}.page.tsx`);
  moves.push([pageFile, dest]);
  // drop colocated layout/loading/error in that folder (auth/layout.tsx is kept)
  for (const e of fs.readdirSync(path.dirname(pageFile))) {
    if (['layout.tsx', 'loading.tsx', 'error.tsx'].includes(e)) deletes.push(path.join(path.dirname(pageFile), e));
  }
  (routesByModule['auth'] ??= []).push({ path: `/auth/${sub}`, component: `auth/ui/${name}.page` });
}

// --- public api-docs -> api_doc module (distinct from the admin api-docs page) ---
const apiDocs = path.join(T, 'api-docs', 'page.tsx');
if (fs.existsSync(apiDocs)) {
  moves.push([apiDocs, path.join('modules', 'api_doc', 'ui', 'public-api-docs.page.tsx')]);
  const lay = path.join(T, 'api-docs', 'layout.tsx');
  if (fs.existsSync(lay)) deletes.push(lay);
  (routesByModule['api_doc'] ??= []).push({ path: '/api-docs', component: 'api_doc/ui/public-api-docs.page' });
}

console.log(`Public pages to migrate: ${moves.length}`);
moves.forEach(([f, t]) => console.log(`  ${f.replace(T + '/', '')} -> ${t}`));

if (!APPLY) { console.log('\n(dry-run)'); process.exit(0); }

const dests = new Set();
for (const [, to] of moves) {
  if (dests.has(to) || fs.existsSync(to)) { console.error(`COLLISION: ${to}`); process.exit(1); }
  dests.add(to);
}
for (const f of deletes) fs.rmSync(f, { force: true });
for (const [from, to] of moves) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); }

for (const [owner, routes] of Object.entries(routesByModule)) {
  const mf = path.join('modules', owner, 'module.json');
  const j = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const existing = Array.isArray(j.routes) ? j.routes : [];
  const seen = new Set(existing.map((r) => r.path));
  j.routes = [...existing, ...routes.filter((r) => !seen.has(r.path))];
  fs.writeFileSync(mf, JSON.stringify(j, null, 2) + '\n');
}

// prune emptied app folders (keep auth/ itself — it has layout.tsx + [...slug])
function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) pruneEmpty(path.join(dir, e.name));
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
pruneEmpty(path.join(T, 'auth'));
pruneEmpty(path.join(T, 'api-docs'));

console.log('Applied.');
