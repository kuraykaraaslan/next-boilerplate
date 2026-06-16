// After moving each module's files down into server/ (and ui/), cross-module
// RELATIVE imports like `../user/user.types` resolve to the wrong place. Rewrite
// any broken relative specifier that points at another module into the
// `@nb/<id>/...` package form. Intra-module relatives that still resolve are
// left untouched.
//
// Usage: node scripts/_migrate/fix-relative.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const moduleIds = new Set(
  fs.readdirSync('modules', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
);
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

// does a relative specifier resolve to a real file from `fromDir`?
function resolves(fromDir, spec) {
  const base = path.resolve(fromDir, spec);
  const cands = [
    base, base + '.ts', base + '.tsx', base + '.mts',
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
  ];
  return cands.some((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

const re = /(['"])((?:\.\.\/)+)([^'".][^'"]*)\1/g;
let changed = 0;
for (const file of walk('modules')) {
  const dir = path.dirname(file);
  const src = fs.readFileSync(file, 'utf8');
  let touched = false;
  const out = src.replace(re, (m, q, ups, rest) => {
    if (resolves(dir, ups + rest)) return m; // intra-module, still valid
    const seg = rest.split('/');
    const tid = seg[0];
    if (!moduleIds.has(tid)) return m; // not a cross-module ref we understand
    const sub = seg.slice(1).join('/');
    let target;
    if (sub === '') target = `@nb/${tid}`;
    else if (sub.startsWith('ui/') || sub.startsWith('hooks/')) target = `@nb/${tid}/${sub}`;
    else target = `@nb/${tid}/server/${sub}`;
    touched = true;
    return `${q}${target}${q}`;
  });
  if (touched) {
    changed++;
    if (APPLY) fs.writeFileSync(file, out);
  }
}
console.log(`${changed} files ${APPLY ? 'rewritten' : 'would change'}.`);
