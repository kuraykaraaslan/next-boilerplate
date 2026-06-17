// One-time migration: turn each modules/<id> into an @kuraykaraaslan/<id> workspace package
// with a server/ + ui/ + hooks/ layout. Phase A moves files; Phase B writes
// package.json. Import rewriting is a separate pass (rewrite-imports.mjs).
//
// Excluded (handled manually due to cross-layer filename collisions or special
// structure): seo (already done), messaging (pre-existing server/ ws entry),
// observability + setting + tenant (same-named file in both layers).
//
// Usage: node scripts/_migrate/migrate.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const EXCLUDE = new Set(['seo', 'messaging', 'observability', 'setting', 'tenant']);
const KEEP_AT_ROOT = (name) => name === 'module.json' || name === 'package.json' || /\.md$/i.test(name);

const log = (...a) => console.log(...a);
const moves = [];
const pkgs = [];

const moduleIds = fs
  .readdirSync('modules', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((id) => !EXCLUDE.has(id))
  .filter((id) => !fs.existsSync(path.join('modules', id, 'package.json'))); // skip already-packaged

function planMove(from, to) {
  if (fs.existsSync(to)) {
    throw new Error(`COLLISION: ${to} already exists (from ${from})`);
  }
  moves.push([from, to]);
}

for (const id of moduleIds) {
  const mdir = path.join('modules', id);
  const serverDir = path.join(mdir, 'server');

  // Phase A1: module-root business files/dirs -> server/
  for (const entry of fs.readdirSync(mdir)) {
    if (entry === 'server' || KEEP_AT_ROOT(entry)) continue;
    planMove(path.join(mdir, entry), path.join(serverDir, entry));
  }

  // Phase A2: next layer (modules_next/<id>) -> ui/ hooks/ server/
  const nextDir = path.join('modules_next', id);
  if (fs.existsSync(nextDir)) {
    for (const entry of fs.readdirSync(nextDir)) {
      if (/\.md$/i.test(entry)) continue; // leave next-layer docs behind (dropped with dir)
      const src = path.join(nextDir, entry);
      if (entry === 'ui') planMove(src, path.join(mdir, 'ui'));
      else if (entry === 'hooks') planMove(src, path.join(mdir, 'hooks'));
      else planMove(src, path.join(serverDir, entry)); // loose files + misc dirs -> server/
    }
  }
}

// Execute moves
log(`Planned ${moves.length} moves across ${moduleIds.length} modules.`);
if (APPLY) {
  for (const [from, to] of moves) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
  }
  // clean up emptied modules_next/<id> dirs
  for (const id of moduleIds) {
    const nextDir = path.join('modules_next', id);
    if (fs.existsSync(nextDir)) {
      const left = fs.readdirSync(nextDir).filter((e) => !/\.md$/i.test(e));
      if (left.length === 0) fs.rmSync(nextDir, { recursive: true, force: true });
    }
  }
}

// Phase B: generate package.json per migrated module
function buildExports(mdir) {
  const exp = { };
  const has = (p) => fs.existsSync(path.join(mdir, p));
  if (has('server/index.ts')) { exp['.'] = './server/index.ts'; exp['./server'] = './server/index.ts'; }
  if (has('server')) exp['./server/*'] = ['./server/*.ts', './server/*/index.ts'];
  if (has('ui/index.ts')) exp['./ui'] = './ui/index.ts';
  if (has('ui')) exp['./ui/*'] = ['./ui/*.tsx', './ui/*.ts', './ui/*/index.ts'];
  if (has('hooks/index.ts')) exp['./hooks'] = './hooks/index.ts';
  if (has('hooks')) exp['./hooks/*'] = ['./hooks/*.ts', './hooks/*.tsx', './hooks/*/index.ts'];
  exp['./module.json'] = './module.json';
  return exp;
}

if (APPLY) {
  for (const id of moduleIds) {
    const mdir = path.join('modules', id);
    const hasReact = fs.existsSync(path.join(mdir, 'ui')) || fs.existsSync(path.join(mdir, 'hooks'));
    const pkg = {
      name: `@kuraykaraaslan/${id}`,
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: buildExports(mdir),
      ...(hasReact ? { peerDependencies: { react: '*', next: '*' } } : {}),
    };
    if (!fs.existsSync(path.join(mdir, 'module.json'))) {
      // payment_core etc: shared code w/o manifest — still a package, no exports for module.json
      delete pkg.exports['./module.json'];
    }
    fs.writeFileSync(path.join(mdir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    pkgs.push(id);
  }
  log(`Wrote ${pkgs.length} package.json files.`);
} else {
  log('DRY RUN — pass --apply to execute. Sample moves:');
  moves.slice(0, 12).forEach(([f, t]) => log(`  ${f}  ->  ${t}`));
}
