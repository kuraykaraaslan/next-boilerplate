// modules/<id>/{ui,hooks}/ component + hook inventory.

import path from 'node:path';
import { MODULES_DIR, walk, rel, readText } from './fs-utils.mjs';

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
  if (/^modules\/[^/]+\/hooks\//.test(r)) return 'hook';
  return 'ui';
}

export async function collectComponents() {
  // React components/hooks now live under modules/<id>/ui/ and modules/<id>/hooks/.
  const files = await walk(MODULES_DIR, (full, name) => {
    // Only the layer directly under the module root: modules/<id>/{ui,hooks}/**
    // (not stray ui/hooks subfolders nested inside server/).
    if (!/^modules\/[^/]+\/(ui|hooks)\//.test(rel(full))) return false;
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
