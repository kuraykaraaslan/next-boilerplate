// Runtime extension registry. Reads the build-time `module-runtime.json`
// `extensions` surface and resolves a contribution id to its server-side
// implementation via the generated `module-extensions` lazy-import map.
//
// This is the backend twin of `module-registry`'s slot mechanism: a host module
// declares named extension points (module.json `extensionPoints`) and satellite
// modules contribute into them (module.json `extensions`). The host discovers
// contributions here — gated by the caller's enabled-module set, exactly like
// the API dispatcher gates route handlers — and never imports a satellite
// directly. Server-only (dynamic-imports handler code); kept React-free.

import runtime from './generated/module-runtime.json';
import { moduleExtensions, type ExtensionModule } from './generated/module-extensions';
import { matchesFilter, type RegistryFilter } from './module-registry';
import type { ModuleScope } from './module-manifest.types';

export interface RuntimeExtension {
  /** Stable contribution id `<moduleId>:<point>:<key|export>`. */
  id: string;
  /** Target extension point, e.g. 'ai:provider'. */
  point: string;
  /** Contributing (satellite) module id. */
  moduleId: string;
  /** Provider key (e.g. 'openai'); null for hook contributions. */
  key: string | null;
  /** Server export id, resolved to `@nb/<exportId>` in the generated map. */
  exportId: string;
  order: number;
  scope: ModuleScope;
  permissions: string[];
  /** Static, code-free metadata declared in the manifest (label, models, …). */
  metadata: Record<string, unknown>;
}

const EXTENSIONS = (runtime.extensions ?? []) as unknown as RuntimeExtension[];

export const extensionRegistry = {
  /**
   * Contributions to a point, filtered by enabled modules / scope / permissions
   * (pass `{ enabledIds: await getEnabledModuleIds(tenantId) }` for per-tenant
   * gating) and sorted by order then id. Pure data — no code is loaded here.
   */
  getContributions(point: string, filter: RegistryFilter = {}): RuntimeExtension[] {
    return EXTENSIONS
      .filter((e) => e.point === point && matchesFilter(e, filter))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  },

  /**
   * Lazy-load the implementation behind a contribution (its default export, or
   * the module namespace if there is no default). Throws if the contribution id
   * is unknown to the generated map (stale snapshot).
   */
  async load<T = unknown>(ext: RuntimeExtension): Promise<T> {
    const loader = moduleExtensions[ext.id];
    if (!loader) throw new Error(`extension implementation not found: '${ext.id}' (run \`npm run registry:snapshot\`)`);
    const mod = await loader();
    return (mod.default ?? mod) as T;
  },
};

export type ExtensionRegistryRuntime = typeof extensionRegistry;
export type { ExtensionModule };
