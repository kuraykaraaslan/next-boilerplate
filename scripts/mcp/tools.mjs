// MCP tool definitions (JSON Schema) exposed by the next-boilerplate registry server.

export const TOOLS = [
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
