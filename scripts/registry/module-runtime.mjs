// Aggregates the plugin-runtime manifest surface (menu / slots / widgets /
// settings tabs / permissions) from all modules into a single runtime JSON, and
// resolves every referenced component id to an `@nb/<id>/...` lazy import so a
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
  const pkgExportsById = new Map(); // moduleId -> Set(package.json export keys)
  const pendingExtensions = []; // { m, ext } resolved after all points are known
  const errors = [];

  function resolveComponent(componentId, ctx) {
    if (!componentId) return;
    const c = componentIndex.get(componentId);
    if (!c) {
      errors.push(`${ctx}: component '${componentId}' not found in component registry`);
      return;
    }
    if (!importsMap.has(componentId)) {
      // component id is `<module>/<layer>/<...>/<Name>` → import `@nb/<that>`.
      importsMap.set(componentId, {
        id: componentId,
        importPath: `@nb/${componentId}`,
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
        apiHandlers.set(r.handler, { id: r.handler, importPath: `@nb/${r.handler}` });
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
    for (const ep of m.extensionPoints ?? []) {
      if (declaredPointIds.has(ep.id)) {
        errors.push(`module '${m.id}': extension point '${ep.id}' is already declared by another module`);
      }
      declaredPointIds.add(ep.id);
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
      extensionImports.set(contributionId, { id: contributionId, importPath: `@nb/${ext.export}` });
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
