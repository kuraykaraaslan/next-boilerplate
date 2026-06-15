// Shared filesystem helpers + path constants for the registry snapshot builder.
// Pure Node — no browser, no TS compiler.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

export const PKG_JSON_PATH    = path.join(REPO_ROOT, 'package.json');
export const MODULES_DIR      = path.join(REPO_ROOT, 'modules');
export const MODULES_NEXT_DIR = path.join(REPO_ROOT, 'modules_next');
export const APP_DIR          = path.join(REPO_ROOT, 'app');
export const OUT_REGISTRY_DIR = path.join(REPO_ROOT, 'public/registry');
export const OUT_MODULES_DIR  = path.join(REPO_ROOT, 'public/modules');

// --- generic walkers ------------------------------------------------------

export async function walk(dir, predicate, out = []) {
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, predicate, out);
    else if (e.isFile() && predicate(full, e.name)) out.push(full);
  }
  return out;
}

export async function listDirs(dir) {
  let ents;
  try { ents = await readdir(dir, { withFileTypes: true }); }
  catch { return []; }
  return ents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
}

export function rel(p) { return path.relative(REPO_ROOT, p).split(path.sep).join('/'); }

export async function readJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return null; }
}

export async function readText(p) {
  try { return await readFile(p, 'utf8'); }
  catch { return null; }
}

export async function exists(p) {
  try { await stat(p); return true; }
  catch { return false; }
}
