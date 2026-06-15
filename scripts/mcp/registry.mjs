// Registry snapshot loader + MCP result helpers for the next-boilerplate MCP server.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');
export const SNAPSHOT_PATH = path.join(REPO_ROOT, 'public/registry/registry.json');
export const MODULES_MD_DIR = path.join(REPO_ROOT, 'public/modules');

let cachedRegistry = null;
export async function getRegistry() {
  if (cachedRegistry) return cachedRegistry;
  let raw;
  try { raw = await readFile(SNAPSHOT_PATH, 'utf8'); }
  catch {
    throw new Error(`Registry snapshot not found at ${path.relative(REPO_ROOT, SNAPSHOT_PATH)}. Run: npm run registry:snapshot`);
  }
  cachedRegistry = JSON.parse(raw);
  return cachedRegistry;
}

export function jsonResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

export function clampInt(v, def, lo, hi) {
  const n = parseInt(v ?? def, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, lo), hi);
}
