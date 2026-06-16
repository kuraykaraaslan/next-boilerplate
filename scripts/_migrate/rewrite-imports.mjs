// One-time codemod: rewrite `@/modules[_next]/<id>/...` import specifiers to the
// `@nb/<id>/...` workspace-package form, for every module already packaged
// (has modules/<id>/package.json). Unpackaged/manual modules are left on `@/`.
//
//   @/modules/<id>            -> @nb/<id>            (root barrel)
//   @/modules/<id>/x          -> @nb/<id>/server/x
//   @/modules_next/<id>/ui/x  -> @nb/<id>/ui/x
//   @/modules_next/<id>/hooks -> @nb/<id>/hooks
//   @/modules_next/<id>/x     -> @nb/<id>/server/x   (loose next files)
//
// Usage: node scripts/_migrate/rewrite-imports.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');

const migrated = new Set(
  fs
    .readdirSync('modules', { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join('modules', d.name, 'package.json')))
    .map((d) => d.name),
);

const SCAN_DIRS = ['app', 'modules', 'modules_next', 'scripts'];
const EXT = /\.(ts|tsx|mts)$/;
const SKIP_DIR = new Set(['node_modules', '.next', '_migrate']);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      walk(path.join(dir, e.name), acc);
    } else if (EXT.test(e.name)) acc.push(path.join(dir, e.name));
  }
  return acc;
}

// Absolute `@/modules[_next]/<id>...` and relative `../modules[_next]/<id>...`.
const reAbs = /(['"])@\/(modules_next|modules)\/([a-z][a-z0-9_]*)((?:\/[^'"]*)?)\1/g;
const reRel = /(['"])(?:\.\.\/)+(modules_next|modules)\/([a-z][a-z0-9_]*)((?:\/[^'"]*)?)\1/g;

function toTarget(layer, id, rest) {
  if (layer === 'modules') return rest === '' ? `@nb/${id}` : `@nb/${id}/server${rest}`;
  if (rest.startsWith('/ui') || rest.startsWith('/hooks')) return `@nb/${id}${rest}`;
  if (rest === '') return `@nb/${id}`;
  return `@nb/${id}/server${rest}`;
}

// repo-root single-file entrypoints (instrumentation.ts, proxy.ts, middleware.ts…)
const rootFiles = fs
  .readdirSync('.', { withFileTypes: true })
  .filter((e) => e.isFile() && EXT.test(e.name) && e.name !== 'next.config.ts')
  .map((e) => e.name);

const allFiles = [...rootFiles];
for (const dir of SCAN_DIRS) if (fs.existsSync(dir)) allFiles.push(...walk(dir));

let changed = 0;
let scanned = 0;
for (const file of allFiles) {
  scanned++;
  const src = fs.readFileSync(file, 'utf8');
  let touched = false;
  const rep = (m, q, layer, id, rest) => {
    if (!migrated.has(id)) return m;
    touched = true;
    return `${q}${toTarget(layer, id, rest)}${q}`;
  };
  const out = src.replace(reAbs, rep).replace(reRel, rep);
  if (touched) {
    changed++;
    if (APPLY) fs.writeFileSync(file, out);
  }
}
console.log(`${changed} files ${APPLY ? 'rewritten' : 'would change'} (scanned ${scanned}).`);
