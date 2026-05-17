#!/usr/bin/env node
// next-boilerplate MCP server (stdio, zero-dep).
//
// Exposes the module / route / entity / component registry to MCP-compatible
// AI clients (Claude Desktop, Cursor, Cline, Windsurf, Zed). Implements
// JSON-RPC 2.0 framed over stdio per the Model Context Protocol spec.
//
// Reads the static snapshot at public/registry/registry.json. Rebuild via
// `npm run registry:snapshot`.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'public/registry/registry.json');
const MODULES_MD_DIR = path.join(REPO_ROOT, 'public/modules');

let cachedRegistry = null;
async function getRegistry() {
  if (cachedRegistry) return cachedRegistry;
  let raw;
  try { raw = await readFile(SNAPSHOT_PATH, 'utf8'); }
  catch (err) {
    throw new Error(`Registry snapshot not found at ${path.relative(REPO_ROOT, SNAPSHOT_PATH)}. Run: npm run registry:snapshot`);
  }
  cachedRegistry = JSON.parse(raw);
  return cachedRegistry;
}

const TOOLS = [
  {
    name: 'list_modules',
    description: 'List business-logic modules under modules/. Optional filter: tier (infrastructure|identity|tenancy|notifications|billing|platform|ai|other) or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['infrastructure', 'identity', 'tenancy', 'notifications', 'billing', 'platform', 'ai', 'other'] },
        tag:  { type: 'string' },
      },
    },
  },
  {
    name: 'get_module',
    description: 'Get a single module by id, with description, dependencies, exports (services/dtos/entities/enums/etc), and inlined README.md.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: 'Module id, e.g. "auth", "tenant_subscription".' } },
    },
  },
  {
    name: 'search_modules',
    description: 'Substring search across module id + name + description + README. Returns up to `limit` matches (default 20).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: 'list_routes',
    description: 'List Next.js API route handlers. Optional filter: scope (system|tenant), method (GET/POST/...), or module id.',
    inputSchema: {
      type: 'object',
      properties: {
        scope:  { type: 'string', enum: ['system', 'tenant'] },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
        module: { type: 'string' },
      },
    },
  },
  {
    name: 'search_routes',
    description: 'Substring search across route urlPath + filePath. Returns up to `limit` matches (default 20).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: 'list_entities',
    description: 'List TypeORM entities. Optional filter: schema (system|tenant|unknown) or module id.',
    inputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'string', enum: ['system', 'tenant', 'unknown'] },
        module: { type: 'string' },
      },
    },
  },
  {
    name: 'get_entity',
    description: 'Get a single TypeORM entity by class name, with columns + relations.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    },
  },
  {
    name: 'list_components',
    description: 'List modules_next/ surface entries (UI components, hooks, *.service.next.ts, utils). Optional filter: module id or kind (ui|hook|service.next|axios|util|type).',
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string' },
        kind:   { type: 'string', enum: ['ui', 'hook', 'service.next', 'axios', 'util', 'type'] },
      },
    },
  },
  {
    name: 'get_conventions',
    description: 'Return the architecture, file-naming, scopes, auth, testing, and security conventions. Read this before adding new code.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_module_readme',
    description: 'Return the per-module markdown chunk at public/modules/<id>.md — combines the README with the dependency map, owned routes, entities, and Next-layer surface.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from disk. Path must be repo-relative (e.g. "modules/auth/auth.service.ts") and resolve inside the repository root.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: { path: { type: 'string' } },
    },
  },
];

async function callTool(name, args = {}) {
  const reg = await getRegistry();
  switch (name) {
    case 'list_modules': {
      const out = reg.modules
        .filter((m) =>
          (!args.tier || m.tier === args.tier) &&
          (!args.tag  || (m.tags || []).includes(args.tag)),
        )
        .map(({ readme, ...rest }) => rest);
      return jsonResult(out);
    }
    case 'get_module': {
      const m = reg.modules.find((x) => x.id === args.id);
      if (!m) return errorResult(`Unknown module id: ${args.id}`);
      return jsonResult(m);
    }
    case 'search_modules': {
      const q = String(args.query || '').toLowerCase();
      const limit = clampInt(args.limit, 20, 1, 100);
      const scored = [];
      for (const m of reg.modules) {
        const hay = `${m.id}\n${m.name}\n${m.description}\n${m.readme || ''}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        scored.push({ score: idx, entry: m });
      }
      scored.sort((a, b) => a.score - b.score);
      const out = scored.slice(0, limit).map(({ entry }) => {
        const { readme, ...rest } = entry;
        return rest;
      });
      return jsonResult(out);
    }
    case 'list_routes': {
      const out = reg.routes.filter((r) =>
        (!args.scope  || r.scope === args.scope) &&
        (!args.method || (r.methods || []).includes(args.method)) &&
        (!args.module || r.module === args.module),
      );
      return jsonResult(out);
    }
    case 'search_routes': {
      const q = String(args.query || '').toLowerCase();
      const limit = clampInt(args.limit, 20, 1, 100);
      const scored = [];
      for (const r of reg.routes) {
        const hay = `${r.urlPath}\n${r.filePath}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        scored.push({ score: idx, entry: r });
      }
      scored.sort((a, b) => a.score - b.score);
      return jsonResult(scored.slice(0, limit).map(({ entry }) => entry));
    }
    case 'list_entities': {
      const out = reg.entities.filter((e) =>
        (!args.schema || e.schema === args.schema) &&
        (!args.module || e.module === args.module),
      );
      return jsonResult(out);
    }
    case 'get_entity': {
      const e = reg.entities.find((x) => x.name === args.name);
      if (!e) return errorResult(`Unknown entity: ${args.name}`);
      return jsonResult(e);
    }
    case 'list_components': {
      const out = reg.components.filter((c) =>
        (!args.module || c.module === args.module) &&
        (!args.kind   || c.kind === args.kind),
      );
      return jsonResult(out);
    }
    case 'get_conventions': {
      return jsonResult({ layers: reg.layers, conventions: reg.conventions });
    }
    case 'get_module_readme': {
      const md = path.join(MODULES_MD_DIR, `${args.id}.md`);
      try {
        const text = await readFile(md, 'utf8');
        return { content: [{ type: 'text', text }] };
      } catch {
        return errorResult(`No markdown chunk for module: ${args.id}`);
      }
    }
    case 'read_file': {
      const relPath = String(args.path || '');
      const abs = path.resolve(REPO_ROOT, relPath);
      if (!abs.startsWith(REPO_ROOT + path.sep) && abs !== REPO_ROOT) {
        return errorResult(`Refusing path outside repo: ${relPath}`);
      }
      try {
        const s = await stat(abs);
        if (s.isDirectory()) return errorResult(`Path is a directory: ${relPath}`);
        const src = await readFile(abs, 'utf8');
        return { content: [{ type: 'text', text: src }] };
      } catch (e) {
        return errorResult(`Could not read ${relPath}: ${e.message}`);
      }
    }
    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

function jsonResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
function clampInt(v, def, lo, hi) {
  const n = parseInt(v ?? def, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, lo), hi);
}

const SERVER_INFO = { name: 'next-boilerplate-registry', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

async function handle(message) {
  if (!message || typeof message !== 'object') return null;
  const { id, method, params } = message;
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        });
      case 'tools/list': return reply(id, { tools: TOOLS });
      case 'tools/call': {
        const result = await callTool(params?.name, params?.arguments || {});
        return reply(id, result);
      }
      case 'ping': return reply(id, {});
      case 'notifications/initialized':
      case 'initialized':
        return null;
      default:
        if (id !== undefined) return reply(id, null, { code: -32601, message: `Method not found: ${method}` });
        return null;
    }
  } catch (err) {
    if (id !== undefined) return reply(id, null, { code: -32000, message: err?.message || String(err) });
    return null;
  }
}

function reply(id, result, error) {
  const payload = { jsonrpc: '2.0', id };
  if (error) payload.error = error;
  else payload.result = result;
  return payload;
}

// --- stdio loop (with async-safe shutdown — fix back-ported from kui-ejs).
// Earlier revisions exited as soon as stdin closed, dropping responses that
// were still being awaited; we now track in-flight requests and only exit
// once every queued line has been written.

let buffer = '';
let inflight = 0;
let stdinEnded = false;

function maybeExit() {
  if (stdinEnded && inflight === 0) process.exit(0);
}

async function processLine(line) {
  inflight++;
  try {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    const out = await handle(msg);
    if (out) process.stdout.write(JSON.stringify(out) + '\n');
  } finally {
    inflight--;
    maybeExit();
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) void processLine(line);
  }
});
process.stdin.on('end', () => {
  stdinEnded = true;
  if (buffer.trim()) {
    void processLine(buffer.trim());
    buffer = '';
  }
  maybeExit();
});
