// Aggregates the plugin-runtime manifest surface (menu / slots / widgets /
// settings tabs / permissions) from all modules into a single runtime JSON, and
// resolves every referenced component id to an `@nb/<id>/...` lazy import so a
// generated component map can be emitted. A manifest referencing a component id
// that the registry never scanned is a hard build error (catches typos early).

export function buildModuleRuntime(modules, components) {
  const componentIndex = new Map();
  for (const c of components) componentIndex.set(c.id, c);

  const runtime = { menu: [], pageRoutes: [], apiRoutes: [], widgets: [], slots: [], settingsTabs: [], permissions: [], modules: [] };
  const importsMap = new Map(); // componentId -> { id, importPath, exportName }
  const apiHandlers = new Map(); // handlerId -> { id, importPath }
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
    for (const t of m.settingsTabs ?? []) {
      resolveComponent(t.component, `module '${m.id}' settingsTab '${t.id}'`);
      runtime.settingsTabs.push({ ...t, componentId: t.component, moduleId: m.id });
    }
    for (const p of m.modulePermissions ?? []) {
      runtime.permissions.push({ ...p, moduleId: m.id });
    }
  }

  if (errors.length) {
    throw new Error('[module-runtime] unresolved component references:\n  ' + errors.join('\n  '));
  }

  // Deterministic ordering (stable git output).
  const byOrderId = (a, b) => (a.order - b.order) || String(a.id).localeCompare(String(b.id));
  runtime.menu.sort(byOrderId);
  runtime.widgets.sort(byOrderId);
  runtime.slots.sort(byOrderId);
  runtime.pageRoutes.sort((a, b) => a.path.localeCompare(b.path));
  runtime.apiRoutes.sort((a, b) => a.path.localeCompare(b.path));
  runtime.modules.sort((a, b) => a.id.localeCompare(b.id));

  const componentImports = [...importsMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const apiHandlerImports = [...apiHandlers.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { runtimeJson: runtime, componentImports, apiHandlerImports };
}
