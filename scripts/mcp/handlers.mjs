// MCP tool dispatch — reads the registry snapshot and serves each tool call.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  REPO_ROOT, MODULES_MD_DIR, getRegistry, jsonResult, errorResult, clampInt,
} from './registry.mjs';

export async function callTool(name, args = {}) {
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
