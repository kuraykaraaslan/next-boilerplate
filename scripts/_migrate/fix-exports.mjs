// Broaden every @kuraykaraaslan/* package's wildcard subpath exports to cover .tsx files and
// directory index.tsx (loose React components can land in server/ or nested ui/).
import fs from 'node:fs';
import path from 'node:path';

const EXP = {
  server: ['./server/*.ts', './server/*.tsx', './server/*/index.ts', './server/*/index.tsx'],
  ui: ['./ui/*.tsx', './ui/*.ts', './ui/*/index.tsx', './ui/*/index.ts'],
  hooks: ['./hooks/*.ts', './hooks/*.tsx', './hooks/*/index.ts', './hooks/*/index.tsx'],
};

let n = 0;
for (const id of fs.readdirSync('modules')) {
  const pkgPath = path.join('modules', id, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.name?.startsWith('@kuraykaraaslan/') || !pkg.exports) continue;
  if (pkg.exports['./server/*']) pkg.exports['./server/*'] = EXP.server;
  if (pkg.exports['./ui/*']) pkg.exports['./ui/*'] = EXP.ui;
  if (pkg.exports['./hooks/*']) pkg.exports['./hooks/*'] = EXP.hooks;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  n++;
}
console.log(`Patched ${n} package.json exports.`);
