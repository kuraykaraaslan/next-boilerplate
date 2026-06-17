// Aggregates the plugin-runtime manifest surface (menu / slots / widgets /
// settings tabs / permissions) from all modules into a single runtime JSON, and
// resolves every referenced component id to an `@kuraykaraaslan/<id>/...` lazy import so a
// generated component map can be emitted. A manifest referencing a component id
// that the registry never scanned is a hard build error (catches typos early).

export function buildModuleRuntime(modules, components) {
  const componentIndex = new Map();
  for (const c of components) componentIndex.set(c.id, c);

  const runtime = { menu: [], pageRoutes: [], apiRoutes: [], widgets: [], slots: [], extensionPoints: [], extensions: [], settingsTabs: [], permissions: [], modules: [] };
  const importsMap = new Map(); // componentId -> { id, importPath, exportName }
  const apiHandlers = new Map(); // handlerId -> { id, importPath }
  const extensionImports = new Map(); // contributionId -> { id, importPath }
  const declaredPointIds = new Set(); // every host-declared extension point id
  const pointOwner = new Map(); // extension point id -> owning (declaring) module id
  const pkgExportsById = new Map(); // moduleId -> Set(package.json export keys)
  const pendingExtensions = []; // { m, ext } resolved after all points are known
  const allModuleIds = new Set(modules.map((x) => x.id)); // every registered module id
  const requiresAdj = new Map(); // moduleId -> [required moduleId] (dependency graph)
  const chainAdj = new Map(); // contributor moduleId -> [host moduleId] (contribution graph)
  const errors = [];
  const warnings = [];

  function resolveComponent(componentId, ctx) {
    if (!componentId) return;
    const c = componentIndex.get(componentId);
    if (!c) {
      errors.push(`${ctx}: component '${componentId}' not found in component registry`);
      return;
    }
    if (!importsMap.has(componentId)) {
      // component id is `<module>/<layer>/<...>/<Name>` → import `@kuraykaraaslan/<that>`.
      importsMap.set(componentId, {
        id: componentId,
        importPath: `@kuraykaraaslan/${componentId}`,
        exportName: c.baseName,
      });
    }
  }

  for (const m of modules) {
    runtime.modules.push({
      id: m.id,
      name: m.name,
      icon: m.icon,
      version: m.version ?? '0.0.0',
      description: m.description ?? '',
      author: m.author ?? '',
      homepage: m.homepage ?? '',
      license: m.license ?? '',
      tags: m.tags ?? [],
      priority: m.priority ?? 100,
      enabled: m.enabled ?? true,
      scope: m.scope,
      tier: m.tier,
      requires: m.dependencies?.requires ?? [],
    });

    for (const item of m.menu ?? []) {
      runtime.menu.push({
        ...item,
        order: item.order ?? 100,
        scope: item.scope ?? 'both',
        permissions: item.permissions ?? [],
        moduleId: m.id,
      });
    }
    for (const r of m.adminRoutes ?? []) {
      resolveComponent(r.component, `module '${m.id}' route '${r.path}'`);
      runtime.pageRoutes.push({
        path: r.path,
        componentId: r.component,
        permissions: r.permissions ?? [],
        moduleId: m.id,
      });
    }
    for (const r of m.apiRoutes ?? []) {
      if (!apiHandlers.has(r.handler)) {
        apiHandlers.set(r.handler, { id: r.handler, importPath: `@kuraykaraaslan/${r.handler}` });
      }
      runtime.apiRoutes.push({ path: r.path, handlerId: r.handler, moduleId: m.id });
    }
    for (const w of m.widgets ?? []) {
      resolveComponent(w.component, `module '${m.id}' widget '${w.id}'`);
      runtime.widgets.push({
        ...w,
        componentId: w.component,
        order: w.order ?? 100,
        scope: w.scope ?? 'both',
        permissions: w.permissions ?? [],
        moduleId: m.id,
      });
    }
    for (const s of m.slots ?? []) {
      resolveComponent(s.component, `module '${m.id}' slot '${s.slot}'`);
      runtime.slots.push({
        id: `${m.id}:${s.slot}:${s.component}`,
        slot: s.slot,
        componentId: s.component,
        order: s.order ?? 100,
        scope: s.scope ?? 'both',
        permissions: s.permissions ?? [],
        props: s.props ?? {},
        moduleId: m.id,
      });
    }
    pkgExportsById.set(m.id, new Set(m.pkgExports ?? []));
    // Dependency graph edges: m -> each required module (for cycle/dangling checks).
    const reqs = m.dependencies?.requires ?? [];
    requiresAdj.set(m.id, reqs);
    for (const dep of reqs) {
      if (!allModuleIds.has(dep)) warnings.push(`module '${m.id}': requires '${dep}', which is not a registered module (missing module.json?)`);
    }
    for (const ep of m.extensionPoints ?? []) {
      if (declaredPointIds.has(ep.id)) {
        errors.push(`module '${m.id}': extension point '${ep.id}' is already declared by another module`);
      }
      declaredPointIds.add(ep.id);
      pointOwner.set(ep.id, m.id);
      runtime.extensionPoints.push({ id: ep.id, kind: ep.kind, description: ep.description ?? '', moduleId: m.id });
    }
    for (const ext of m.extensions ?? []) {
      pendingExtensions.push({ m, ext });
    }
    for (const t of m.settingsTabs ?? []) {
      resolveComponent(t.component, `module '${m.id}' settingsTab '${t.id}'`);
      runtime.settingsTabs.push({ ...t, componentId: t.component, moduleId: m.id });
    }
    for (const p of m.modulePermissions ?? []) {
      runtime.permissions.push({ ...p, moduleId: m.id });
    }
  }

  // Resolve extension contributions now that every host point is known.
  for (const { m, ext } of pendingExtensions) {
    const ctx = `module '${m.id}' extension -> '${ext.point}'`;
    if (!declaredPointIds.has(ext.point)) {
      errors.push(`${ctx}: targets unknown extension point (no module declares it)`);
    }
    // Contribution graph edge: contributor -> the module that owns the target point.
    const host = pointOwner.get(ext.point);
    if (host && host !== m.id) {
      const list = chainAdj.get(m.id) ?? [];
      if (!list.includes(host)) list.push(host);
      chainAdj.set(m.id, list);
    }
    // The `export` must be published by the contributing module's package.json
    // (so the generated dynamic import actually resolves) — catches typos early.
    if (ext.export) {
      const moduleId = ext.export.split('/')[0];
      const exportKey = './' + ext.export.split('/').slice(1).join('/');
      const exportsSet = pkgExportsById.get(moduleId);
      if (!exportsSet || !exportsSet.has(exportKey)) {
        errors.push(`${ctx}: export '${ext.export}' is not declared in ${moduleId}/package.json "exports" (looked for "${exportKey}")`);
      }
    }
    const contributionId = `${m.id}:${ext.point}:${ext.key ?? ext.export}`;
    if (!extensionImports.has(contributionId)) {
      extensionImports.set(contributionId, { id: contributionId, importPath: `@kuraykaraaslan/${ext.export}` });
    }
    runtime.extensions.push({
      id: contributionId,
      point: ext.point,
      moduleId: m.id,
      key: ext.key ?? null,
      exportId: ext.export,
      order: ext.order ?? 100,
      scope: ext.scope ?? 'both',
      permissions: ext.permissions ?? [],
      metadata: ext.metadata ?? {},
    });
  }

  // Graph safety: a dependency cycle (requires) or a contribution chain cycle
  // (A contributes into B's point, B into A's) is unresolvable at scale — surface
  // the offending loop instead of letting it boot into a silent deadlock.
  const reqCycle = findCycle(requiresAdj);
  if (reqCycle) errors.push(`dependency cycle in 'requires': ${reqCycle.join(' -> ')}`);
  const chainCycle = findCycle(chainAdj);
  if (chainCycle) errors.push(`contribution chain cycle (extension points): ${chainCycle.join(' -> ')}`);

  if (warnings.length) {
    console.warn('[module-runtime] warnings:\n  ' + warnings.join('\n  '));
  }
  if (errors.length) {
    throw new Error('[module-runtime] unresolved references:\n  ' + errors.join('\n  '));
  }

  // Deterministic ordering (stable git output).
  const byOrderId = (a, b) => (a.order - b.order) || String(a.id).localeCompare(String(b.id));
  runtime.menu.sort(byOrderId);
  runtime.widgets.sort(byOrderId);
  runtime.slots.sort(byOrderId);
  runtime.pageRoutes.sort((a, b) => a.path.localeCompare(b.path));
  runtime.apiRoutes.sort((a, b) => a.path.localeCompare(b.path));
  runtime.extensions.sort(byOrderId);
  runtime.extensionPoints.sort((a, b) => a.id.localeCompare(b.id));
  runtime.modules.sort((a, b) => a.id.localeCompare(b.id));

  const componentImports = [...importsMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const apiHandlerImports = [...apiHandlers.values()].sort((a, b) => a.id.localeCompare(b.id));
  const extensionImportList = [...extensionImports.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { runtimeJson: runtime, componentImports, apiHandlerImports, extensionImports: extensionImportList };
}

/**
 * Returns the first directed cycle found in `adj` (Map<node, node[]>) as a path
 * `[a, b, …, a]`, or null if the graph is acyclic. Iterative DFS with WHITE/GREY/
 * BLACK colouring; targets absent from the key set are treated as leaf nodes.
 */
function findCycle(adj) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  const parent = new Map();
  const nodes = [...adj.keys()];

  for (const start of nodes) {
    if (color.get(start)) continue;
    const stack = [{ node: start, i: 0 }];
    color.set(start, GREY);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const neighbours = adj.get(top.node) ?? [];
      if (top.i < neighbours.length) {
        const next = neighbours[top.i++];
        const c = color.get(next) ?? WHITE;
        if (c === GREY) {
          // Found a back-edge → reconstruct the loop from `top.node` back to `next`.
          const cycle = [next];
          let cur = top.node;
          while (cur !== next && cur !== undefined) { cycle.push(cur); cur = parent.get(cur); }
          cycle.push(next);
          return cycle.reverse();
        }
        if (c === WHITE) {
          color.set(next, GREY);
          parent.set(next, top.node);
          stack.push({ node: next, i: 0 });
        }
      } else {
        color.set(top.node, BLACK);
        stack.pop();
      }
    }
  }
  return null;
}
