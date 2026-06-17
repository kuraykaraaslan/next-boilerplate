# Plugin Runtime

- **id:** `plugin_runtime`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/plugin_runtime/`
- **tags:** platform, marketplace, security
- **icon:** `fas fa-shield-halved`
- **hasNextLayer:** true

Sandboxed execution runtime for untrusted community plugins (V8 isolates, brokered capabilities, no direct DB access).

## Dependencies

- **requires:** `db`, `env`, `setting`, `storage`, `audit_log`, `webhook`, `common`

## Entities

- `plugin_kv.entity.ts`

## TypeORM entities

- `PluginKv` (system) — `modules/plugin_runtime/server/entities/plugin_kv.entity.ts`

## Next layer (modules_next/) surface

- `plugin_runtime/ui/plugin-frame.component` _(ui, client)_
- `plugin_runtime/ui/plugin-host.page` _(ui, client)_
