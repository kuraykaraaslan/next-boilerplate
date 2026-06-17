// Turbopack does not resolve array-fallback wildcard subpath exports (e.g.
// "./ui/*": ["./ui/*.tsx", "./ui/*.ts"]) the way tsc/Node do. Regenerate every
// @kuraykaraaslan/* package's exports as an EXPLICIT enumeration of each source file, which
// every bundler resolves. Directory imports get an extra "<dir>" -> index entry.
//
// Usage: node scripts/_migrate/gen-explicit-exports.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIRS = ['server', 'ui', 'hooks'];
const EXT = /\.(ts|tsx|mts)$/;
const isTest = (p) => /\.test\.[tj]sx?$/.test(p);

function walk(dir, base, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else if (EXT.test(e.name) && !isTest(e.name)) acc.push(path.relative(base, p));
  }
  return acc;
}

let count = 0;
for (const id of fs.readdirSync('modules')) {
  const root = path.join('modules', id);
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.name?.startsWith('@kuraykaraaslan/')) continue;

  const exp = {};
  // preserve an explicit non-standard main (messaging: server/barrel.ts)
  const mainFromPrev = pkg.exports?.['.'];

  for (const sub of SRC_DIRS) {
    const subDir = path.join(root, sub);
    if (!fs.existsSync(subDir)) continue;
    for (const rel of walk(subDir, root)) {
      const relPosix = rel.split(path.sep).join('/');
      const noext = relPosix.replace(EXT, '');
      exp[`./${noext}`] = `./${relPosix}`;
      // directory import -> its index
      if (/\/index$/.test(noext)) {
        exp[`./${noext.replace(/\/index$/, '')}`] = `./${relPosix}`;
      }
    }
  }

  // root barrel: "." and "./server"
  if (mainFromPrev && mainFromPrev !== './server/index.ts') {
    exp['.'] = mainFromPrev; // messaging barrel.ts
    exp['./server'] = mainFromPrev;
  } else if (fs.existsSync(path.join(root, 'server/index.ts'))) {
    exp['.'] = './server/index.ts';
    exp['./server'] = './server/index.ts';
  }
  if (fs.existsSync(path.join(root, 'ui/index.ts'))) exp['./ui'] = './ui/index.ts';
  if (fs.existsSync(path.join(root, 'hooks/index.ts'))) exp['./hooks'] = './hooks/index.ts';
  if (fs.existsSync(path.join(root, 'module.json'))) exp['./module.json'] = './module.json';

  pkg.exports = exp;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  count++;
}
console.log(`Regenerated explicit exports for ${count} packages.`);
