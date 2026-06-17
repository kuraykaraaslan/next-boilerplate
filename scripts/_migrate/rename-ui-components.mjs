// One-time: rename every React component under modules/<id>/ui/ to the
// `<kebab-name>.component.tsx` convention and rewrite all importers (absolute
// @kuraykaraaslan/... and relative). Pages (*.page.tsx), barrels (index.*), non-tsx files
// and generated/ are left untouched. Resolve-based so it only touches specifiers
// that actually point at a renamed file.
//
//   node scripts/_migrate/rename-ui-components.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();

function kebab(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'generated' || e.name === 'node_modules') continue;
      walk(p, acc);
    } else acc.push(p);
  }
  return acc;
}

// 1. Build rename map: absolute-no-ext old -> { newBase, newAbs }
const renameByOldNoExt = new Map();
const collisions = [];
for (const id of fs.readdirSync('modules', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const uiDir = path.join('modules', id, 'ui');
  if (!fs.existsSync(uiDir)) continue;
  const seen = new Set();
  for (const f of walk(uiDir)) {
    if (!f.endsWith('.tsx')) continue;
    const base = path.basename(f, '.tsx');
    if (base === 'index' || base.endsWith('.page') || base.endsWith('.component') || /\.test$/.test(base)) continue;
    const newBase = `${kebab(base)}.component`;
    const dir = path.dirname(f);
    const newAbs = path.resolve(dir, `${newBase}.tsx`);
    if (seen.has(newAbs)) collisions.push(newAbs);
    seen.add(newAbs);
    renameByOldNoExt.set(path.resolve(dir, base), { newBase, newAbs, oldAbs: path.resolve(f) });
  }
}

if (collisions.length) {
  console.error('COLLISIONS (resolve manually):\n' + collisions.join('\n'));
  process.exit(1);
}

// 2. Rewrite importers across the repo.
const SCAN = ['app', 'modules', 'scripts'];
const ROOT_FILES = fs.readdirSync('.', { withFileTypes: true }).filter((e) => e.isFile() && /\.(ts|tsx|mts)$/.test(e.name)).map((e) => e.name);
const EXT = /\.(ts|tsx|mts)$/;
const allFiles = [...ROOT_FILES];
for (const d of SCAN) if (fs.existsSync(d)) walk(d, allFiles);

// resolve a specifier (from a file) to an absolute-no-ext path of a renamed file, or null
function resolveRenamed(fromFile, spec) {
  let absNoExt = null;
  if (spec.startsWith('@kuraykaraaslan/')) {
    // @kuraykaraaslan/<id>/<sub...>  ->  modules/<id>/<sub...>
    const rest = spec.slice('@kuraykaraaslan/'.length);
    absNoExt = path.resolve(ROOT, 'modules', rest);
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    absNoExt = path.resolve(path.dirname(fromFile), spec);
  } else return null;
  return renameByOldNoExt.has(absNoExt) ? renameByOldNoExt.get(absNoExt) : null;
}

const specRe = /(['"])((?:@nb\/|\.\.?\/)[^'"]+)\1/g;
let changedFiles = 0;
for (const file of allFiles) {
  const abs = path.resolve(file);
  const src = fs.readFileSync(abs, 'utf8');
  let touched = false;
  const out = src.replace(specRe, (m, q, spec) => {
    const hit = resolveRenamed(abs, spec);
    if (!hit) return m;
    const newSpec = spec.replace(/[^/]+$/, hit.newBase);
    touched = true;
    return `${q}${newSpec}${q}`;
  });
  if (touched) {
    changedFiles++;
    if (APPLY) fs.writeFileSync(abs, out);
  }
}

// 3. Rename the files.
if (APPLY) {
  for (const { oldAbs, newAbs } of renameByOldNoExt.values()) fs.renameSync(oldAbs, newAbs);
}

console.log(`${renameByOldNoExt.size} components ${APPLY ? 'renamed' : 'to rename'}; ${changedFiles} files ${APPLY ? 'rewritten' : 'would change'}.`);
