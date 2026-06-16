#!/usr/bin/env node
// Builds offline AI-discoverable artifacts for next-boilerplate.
//
//   1. public/registry/registry.json        — full catalog (modules + routes + entities + components + conventions)
//   2. public/registry/registry.index.json  — lightweight index (no inlined README bodies)
//   3. public/registry/modules.json         — modules only (full, with README bodies)
//   4. public/registry/routes.json          — API route inventory
//   5. public/registry/entities.json        — TypeORM entity inventory
//   6. public/registry/components.json      — modules_next/ component + hook inventory
//   7. public/modules/<id>.md               — per-module markdown chunk (README + dependency info)
//   8. public/modules/_index.json           — { id → { tier, file } } map
//
// Pure Node — walks the filesystem and parses with conservative regex. No
// browser, no TS compiler. Re-run via `npm run registry:snapshot`.
//
// The collectors live in `scripts/registry/*.mjs`; this file orchestrates them
// and writes the output artifacts.

import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  PKG_JSON_PATH, OUT_REGISTRY_DIR, OUT_MODULES_DIR, REPO_ROOT, readJson,
} from './registry/fs-utils.mjs';
import { collectModules } from './registry/modules.mjs';
import { collectRoutes } from './registry/routes.mjs';
import { collectEntities } from './registry/entities.mjs';
import { collectComponents } from './registry/components.mjs';
import { markdownForModule } from './registry/markdown.mjs';
import { buildModuleRuntime } from './registry/module-runtime.mjs';
import { renderComponentMap } from './registry/codegen.mjs';

async function main() {
  const t0 = Date.now();
  console.log('[snapshot] reading package.json …');
  const pkg = await readJson(PKG_JSON_PATH);

  console.log('[snapshot] collecting modules …');
  const modules = await collectModules();

  console.log('[snapshot] collecting routes …');
  const routes = await collectRoutes();

  console.log('[snapshot] collecting entities …');
  const entities = await collectEntities();

  console.log('[snapshot] collecting modules_next components …');
  const components = await collectComponents();

  const layers = {
    app:          'Next.js App Router — pages, layouts, route handlers. Thin glue importing both layers below.',
    modules_next: 'Next.js binding layer — React components, hooks, *.service.next.ts extensions. Imports modules/* + Next/React.',
    modules:      'Framework-agnostic business logic — services, DTOs, entities. No next/*, no react, no browser APIs.',
  };
  const conventions = {
    architecture: 'Three layers, strict one-way dependency: app/ -> modules_next/ -> modules/. modules/ NEVER imports modules_next/ or app/.',
    fileNaming:   '*.service.ts (logic), *.dto.ts (Zod), *.types.ts, *.enums.ts, *.messages.ts (i18n keys), *.setting.keys.ts, *.entity.ts (TypeORM), *.provider.ts (pluggable), *.job.ts (BullMQ), *.service.next.ts (Next-only extension), *.test.ts colocated.',
    scopes:       'Two URL scopes: system (super-admin, no tenant) under /system/... and tenant (per-tenant, resolved by proxy.ts) under /tenant/[tenantId]/.... Each has its own /admin, /api, /auth subtrees.',
    auth:         'JWT (httpOnly cookies), OTP, TOTP, SAML, OAuth (12+ providers via auth_sso), WebAuthn/Passkeys (user_security). Sessions: user_session (4 sub-services). Impersonation: always audited.',
    testing:      'Vitest + @testing-library/react. Tests colocated as *.test.ts / *.test.tsx beside the file under test. Run `npm test`.',
    security:     'Read SECURITY.md for the full threat model. Path alias is the single `@/*` -> `./*`. Multi-tenant data isolation enforced by per-tenant TypeORM DataSource (modules/db).',
  };

  const registry = {
    $schema: '/schemas/registry-v1.json',
    name: pkg?.name ?? 'next-boilerplate',
    version: pkg?.version ?? '0.0.0',
    registryVersion: '1.0',
    generatedAt: new Date().toISOString(),
    description: 'Production-grade multi-tenant SaaS starter on Next.js 16 with strict three-layer architecture.',
    layers,
    conventions,
    modules,
    routes,
    entities,
    components,
  };

  await rm(OUT_REGISTRY_DIR, { recursive: true, force: true });
  await rm(OUT_MODULES_DIR,  { recursive: true, force: true });
  await mkdir(OUT_REGISTRY_DIR, { recursive: true });
  await mkdir(OUT_MODULES_DIR,  { recursive: true });

  // Slim modules (drop README bodies) for the index variant.
  const slimModules = modules.map(({ readme, ...rest }) => rest);
  const indexRegistry = { ...registry, modules: slimModules };

  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.json'),       JSON.stringify(registry,      null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'registry.index.json'), JSON.stringify(indexRegistry, null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'modules.json'),        JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, modules },    null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'routes.json'),         JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, routes },     null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'entities.json'),       JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, entities },   null, 2) + '\n', 'utf8');
  await writeFile(path.join(OUT_REGISTRY_DIR, 'components.json'),     JSON.stringify({ name: registry.name, registryVersion: registry.registryVersion, generatedAt: registry.generatedAt, components }, null, 2) + '\n', 'utf8');

  // Plugin runtime artifacts (committed source, not public/): the runtime JSON
  // (menu/slots/widgets data, server-readable) and the lazy component map
  // (React, client-only). Split across server/ and ui/ to respect the boundary.
  const { runtimeJson, componentImports } = buildModuleRuntime(modules, components);
  const SERVER_GEN = path.join(REPO_ROOT, 'modules/common/server/generated');
  const UI_GEN     = path.join(REPO_ROOT, 'modules/common/ui/generated');
  await mkdir(SERVER_GEN, { recursive: true });
  await mkdir(UI_GEN, { recursive: true });
  await writeFile(
    path.join(SERVER_GEN, 'module-runtime.json'),
    JSON.stringify({ generatedAt: registry.generatedAt, ...runtimeJson }, null, 2) + '\n',
    'utf8',
  );
  await writeFile(path.join(UI_GEN, 'module-components.ts'), renderComponentMap(componentImports), 'utf8');

  // Per-module markdown chunks.
  const indexMap = {};
  for (const mod of modules) {
    const related = {
      routes:     routes.filter((r) => r.module === mod.id),
      entities:   entities.filter((e) => e.module === mod.id),
      components: components.filter((c) => c.module === mod.id),
    };
    const md = markdownForModule(mod, related);
    const file = `${mod.id}.md`;
    await writeFile(path.join(OUT_MODULES_DIR, file), md, 'utf8');
    indexMap[mod.id] = {
      name: mod.name,
      tier: mod.tier,
      tags: mod.tags,
      hasNextLayer: mod.hasNextLayer,
      routeCount: related.routes.length,
      entityCount: related.entities.length,
      componentCount: related.components.length,
      file,
    };
  }
  await writeFile(path.join(OUT_MODULES_DIR, '_index.json'), JSON.stringify(indexMap, null, 2) + '\n', 'utf8');

  const ms = Date.now() - t0;
  console.log(`[snapshot] wrote registry — ${modules.length} modules, ${routes.length} routes, ${entities.length} entities, ${components.length} components in ${ms}ms`);
}

main().catch((err) => {
  console.error('[snapshot] failed:', err.stack || err.message);
  process.exit(1);
});
