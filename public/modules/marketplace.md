# Marketplace

- **id:** `marketplace`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/marketplace/`
- **tags:** platform, marketplace
- **icon:** `fas fa-store`
- **hasNextLayer:** true

Browse, install, activate, and remove tenant modules; publish your own modules to a curated, approval-gated registry.

## Dependencies

- **requires:** `db`, `env`, `setting`, `audit_log`, `auth`, `tenant`, `storage`, `plugin_runtime`, `common`

## Entities

- `module_install.entity.ts`
- `published_module.entity.ts`
- `published_module_version.entity.ts`
- `publisher.entity.ts`

## TypeORM entities

- `ModuleInstall` (system) — `modules/marketplace/server/entities/module_install.entity.ts`
- `PublishedModule` (system) — `modules/marketplace/server/entities/published_module.entity.ts`
- `PublishedModuleVersion` (system) — `modules/marketplace/server/entities/published_module_version.entity.ts`
- `Publisher` (system) — `modules/marketplace/server/entities/publisher.entity.ts`

## Next layer (modules_next/) surface

- `marketplace/ui/developer-page.component` _(ui, client)_
- `marketplace/ui/developer.page` _(ui, client)_
- `marketplace/ui/marketplace-page.component` _(ui, client)_
- `marketplace/ui/marketplace.page` _(ui, client)_
- `marketplace/ui/plugin-config-modal.component` _(ui, client)_
- `marketplace/ui/review-page.component` _(ui, client)_
- `marketplace/ui/review.page` _(ui, client)_
