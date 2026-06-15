// modules_next/ component + hook inventory.

import path from 'node:path';
import { MODULES_NEXT_DIR, walk, rel, readText } from './fs-utils.mjs';

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
  if (/\/ui\//.test(r))                return 'ui';
  if (/\/hooks\//.test(r))             return 'hook';
  if (/\.service\.next\.ts$/.test(r))  return 'service.next';
  if (/\/axios\//.test(r))             return 'axios';
  if (/\/utils\//.test(r))             return 'util';
  if (/module\.types\.ts$/.test(r))    return 'type';
  return 'ui';
}

export async function collectComponents() {
  const files = await walk(MODULES_NEXT_DIR, (full, name) => {
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
