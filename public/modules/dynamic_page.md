# Dynamic Pages

- **id:** `dynamic_page`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/dynamic_page/`
- **tags:** cms, pages, blocks, builder, i18n
- **icon:** `fas fa-file-alt`
- **hasNextLayer:** true

Tenant-aware block-based page builder with i18n support. Supports code blocks (Prose, Hero, Popup Modal, Custom) and custom HTML template blocks. Public pages served at /tenant/[tenantId]/p/[slug].

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `seo`

## Services

- `dynamic_collection.crud.service.ts`
- `dynamic_collection.item.service.ts`
- `dynamic_collection.service.ts`
- `dynamic_page.block.service.ts`
- `dynamic_page.crud.service.ts`
- `dynamic_page.service.ts`

## DTOs

- `dynamic_page.dto.ts`

## Entities

- `dynamic_collection.entity.ts`
- `dynamic_collection_item.entity.ts`
- `dynamic_page.entity.ts`
- `dynamic_page_block.entity.ts`
- `dynamic_page_translation.entity.ts`

## Enums

- `dynamic_page.enums.ts`

## Message keys

- `dynamic_page.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/[dynamicPageId]`
- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages/[dynamicPageId]/translations`
- `tenant` DELETE `/tenant/[tenantId]/api/dynamic-pages/[dynamicPageId]/translations/[lang]`
- `tenant` GET/POST/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/block-action/[blockType]`
- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages/block-definitions`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/block-definitions/[blockId]`
- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages/collections`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/collections/[collectionId]`
- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages/collections/[collectionId]/items`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/collections/[collectionId]/items/[itemId]`

## TypeORM entities

- `DynamicCollection` (system) — `modules/dynamic_page/entities/dynamic_collection.entity.ts`
- `DynamicCollectionItem` (system) — `modules/dynamic_page/entities/dynamic_collection_item.entity.ts`
- `DynamicPage` (system) — `modules/dynamic_page/entities/dynamic_page.entity.ts`
- `DynamicPageBlock` (system) — `modules/dynamic_page/entities/dynamic_page_block.entity.ts`
- `DynamicPageTranslation` (system) — `modules/dynamic_page/entities/dynamic_page_translation.entity.ts`

## Next layer (modules_next/) surface

- `dynamic_page/dynamic/Blocks/BannerBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/ContactFormBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/CTABlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/CustomBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FaqAccordionBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FeatureGridBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterColumns` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterCommerce` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterMinimal` _(ui, client)_
- `dynamic_page/dynamic/Blocks/GalleryBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/HeroBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/LogoGridBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarCommerce` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarMarketing` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarMarketing.types` _(ui)_
- `dynamic_page/dynamic/Blocks/NavBarSimple` _(ui, client)_
- `dynamic_page/dynamic/Blocks/partials/NavBarMegaSection` _(ui, client)_
- `dynamic_page/dynamic/Blocks/partials/NavBarMobilePanel` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/animations` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/CloseBtn` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/constants` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/EditorPreview` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/index` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/PopupCard` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/PopupOverlay` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/types` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/utils` _(ui)_
- `dynamic_page/dynamic/Blocks/PricingTableBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/ProseBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/StatsBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/TeamBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/TestimonialsBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/TimelineBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/VideoBlock` _(ui, client)_
- `dynamic_page/dynamic/Editor/BackupModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/Canvas` _(ui, client)_
- `dynamic_page/dynamic/Editor/EditorTopBar` _(ui, client)_
- `dynamic_page/dynamic/Editor/hooks/useEditorDraft` _(hook, client)_
- `dynamic_page/dynamic/Editor/hooks/useEditorKeyboard` _(hook, client)_
- `dynamic_page/dynamic/Editor/index` _(ui, client)_
- `dynamic_page/dynamic/Editor/LeftSidebar` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/BlockPalette` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/CanvasBlock` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/CanvasOverlays` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/ColorTokenField` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/IconPickerField` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/LayersPanel` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/LinkField` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/PropFieldComplex` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/PropFieldRenderer` _(ui, client)_
- `dynamic_page/dynamic/Editor/partials/PropFieldSimple` _(ui, client)_
- `dynamic_page/dynamic/Editor/PropsPanel` _(ui, client)_
- `dynamic_page/dynamic/Editor/RepeaterField` _(ui, client)_
- `dynamic_page/dynamic/Editor/RightSidebar` _(ui, client)_
- `dynamic_page/dynamic/Editor/SeoModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/ShortcutsModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/stores/editor.types` _(ui)_
- `dynamic_page/dynamic/Editor/stores/editorStore` _(ui)_
- `dynamic_page/dynamic/Editor/stores/slices/blockSlice` _(ui)_
- `dynamic_page/dynamic/Editor/stores/slices/persistSlice` _(ui)_
- … and 24 more

## README

# Dynamic Page Module

A tenant-scoped, block-based CMS / page builder. Each tenant owns an independent set of pages (with per-language translations) and a reusable library of block definitions. Published pages are rendered on the public site under `/tenant/[tenantId]/[...slug]`.

---

## Entities

All three entities live in the **tenant DB** (each row is isolated by `tenantId`).

| Entity | Table | Description |
|---|---|---|
| `DynamicPage` | `dynamic_pages` | A page: `slug`, `title`, `description`, `keywords[]`, `sections` (block instances), SEO `metadata`, `status`, `schemaVersion`. Unique `(tenantId, slug)`. |
| `DynamicPageTranslation` | `dynamic_page_translations` | Per-language override of a page's `title`, `description` and `sections`, keyed by `lang`. Unique `(dynamicPageId, lang)`, `ON DELETE CASCADE` with its page. |
| `DynamicPageBlock` | `dynamic_page_blocks` | A reusable block definition shown in the editor: `type`, `label`, `category`, `schema`, `defaultProps`, `template`, optional `script`, `isSystem` flag. Unique `(tenantId, type)`. |

`status` is one of `DynamicPageStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`. Page `sections` and translation `sections` are arrays of `BlockData` (`{ id, type, order, props, hidden?, label?, className? }`). `metadata` follows `PageMetadataSchema` (OpenGraph / Twitter / `canonical` / `robots`). `CURRENT_SCHEMA_VERSION` is `2`.

---

## Service / Responsibilities

`DynamicPageService` (all methods take `tenantId` and resolve the per-tenant DataSource via `tenantDataSourceFor`):

**Pages**
- `listPages` — paginated, filterable (`search` over title/slug, `status`) and sortable list scoped to the tenant.
- `getPage` — fetch one page by id.
- `getPageBySlug` — fetch by slug, **Redis-cached** (`dp:slug:${tenantId}:${slug}`, `SLUG_TTL = 3600s`) behind `singleFlight`; backs the public renderer.
- `createPage` — enforces slug uniqueness per tenant (`SLUG_TAKEN`); stamps `schemaVersion = CURRENT_SCHEMA_VERSION`.
- `updatePage` — re-checks slug uniqueness on change; invalidates the slug cache for the old and new slug.
- `deletePage` — removes the page, drops its slug cache, and deletes the linked SEO row via `SeoService.delete(tenantId, 'dynamic_page', pageId)`.

**Translations**
- `getTranslations` — list a page's translations ordered by `lang`.
- `upsertTranslation` — insert or update the `(page, lang)` translation.
- `deleteTranslation` — remove a single language for a page (`TRANSLATION_NOT_FOUND` if absent).

**Blocks (block library)**
- `listBlocks` — list the tenant's block definitions, **Redis-cached** (`dp:blocks:${tenantId}`, `BLOCKS_TTL = 300s`) behind `singleFlight`.
- `getBlock` — fetch one block by id.
- `createBlock` / `updateBlock` — enforce `type` uniqueness per tenant (`BLOCK_TYPE_TAKEN`); each invalidates the block-library cache.
- `deleteBlock` — blocked with `SYSTEM_BLOCK_PROTECTED` when `isSystem` is set; otherwise removes the block and invalidates the cache.

Cache TTLs are jittered (`jitter()`) to avoid stampedes. Validation is via Zod (`*RecordSchema`); inputs come from the DTOs below.

---

## DTOs

Defined in `dynamic_page.dto.ts` (Zod):

- `CreatePageDTO` / `UpdatePageDTO` (partial) — `slug` (lowercase slash-separated segments, no leading/trailing slash, defaults `''`), `title`, `description?`, `keywords[]`, `sections[]`, `metadata`, `status` (default `DRAFT`), `schemaVersion`.
- `UpsertTranslationDTO` — `lang`, `title`, `description?`, `sections[]`.
- `CreateBlockDTO` / `UpdateBlockDTO` (partial) — `type` (`[a-zA-Z0-9_-]+`), `label`, `category` (default `General`), `description?`, `schema`, `defaultProps`, `template`, `script?`, `isSystem` (default `false`).

`ListPagesQuerySchema` drives `listPages`: `page`, `pageSize` (≤100), `search?`, `status?`, `sortBy` (`title|slug|status|createdAt|updatedAt`), `sortDir` (`asc|desc`).

---

## API Routes (tenant-scoped, ADMIN+)

Every handler calls `TenantSessionNextService.authenticateTenantByRequest({ … requiredTenantRole: 'ADMIN' })`.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[id]/api/dynamic-pages` | List pages (query params per `ListPagesQuerySchema`) |
| POST | `/tenant/[id]/api/dynamic-pages` | Create page |
| GET | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]` | Get page |
| PATCH | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]` | Update page |
| DELETE | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]` | Delete page |
| GET | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]/translations` | List translations |
| POST | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]/translations` | Upsert a translation |
| DELETE | `/tenant/[id]/api/dynamic-pages/[dynamicPageId]/translations/[lang]` | Delete a translation |
| GET | `/tenant/[id]/api/dynamic-pages/block-definitions` | List block definitions |
| POST | `/tenant/[id]/api/dynamic-pages/block-definitions` | Create block definition |
| GET | `/tenant/[id]/api/dynamic-pages/block-definitions/[blockId]` | Get block definition |
| PATCH | `/tenant/[id]/api/dynamic-pages/block-definitions/[blockId]` | Update block definition |
| DELETE | `/tenant/[id]/api/dynamic-pages/block-definitions/[blockId]` | Delete block definition |

### Public rendering

Published pages are served by the App Router page at `app/tenant/[tenantId]/[...slug]/page.tsx`, which delegates to `modules_next/dynamic_page/PublicDynamicPage`. It loads via `getPageBySlug`, renders **only** `PUBLISHED` pages (`notFound()` otherwise), supports up to `MAX_SLUG_DEPTH = 4` slug segments, skips reserved `__`-prefixed paths, and resolves a `?lang=` translation when present.

---

## Settings

This module declares **no** settings keys and reads no `SettingService` config — every tenant's content is fully independent with no platform/root-only configuration.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A tenant-scoped, block-based CMS / page builder (pages, per-language translations, and a reusable block library) whose entire surface is per-tenant data stored in each tenant's own DB; it declares no settings keys and reads no SettingService config, so every tenant has fully independent content with no platform/root-only configuration.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `DynamicPage` | `dynamic_pages` | slug, title, description, keywords, sections, metadata, status, schemaVersion |
| `DynamicPageTranslation` | `dynamic_page_translations` | dynamicPageId, lang, title, description, sections |
| `DynamicPageBlock` | `dynamic_page_blocks` | type, label, category, description, schema, defaultProps, template, script, isSystem |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `dynamic_page.service.ts` — Every method takes tenantId and resolves the per-tenant DataSource via tenantDataSourceFor(tenantId), then scopes every query with WHERE tenantId = :tenantId; uniqueness is per tenant (slug unique per tenant in createPage/updatePage, block type unique per tenant in createBlock/updateBlock), so each tenant has an isolated set of pages, translations and blocks.
- `dynamic_page.service.ts:getPageBySlug/listBlocks` — Redis caches are namespaced per tenant via dp:slug:${tenantId}:${slug} and dp:blocks:${tenantId}, and invalidated on that tenant's writes, so cached page/block reads are isolated per tenant.
- `dynamic_page.service.ts:deleteBlock` — Blocks flagged isSystem (a per-tenant column) are protected from deletion (SYSTEM_BLOCK_PROTECTED), so which blocks are deletable depends on each tenant's own block rows.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Slug-cache TTL (SLUG_TTL = 3600s) and block-library cache TTL (BLOCKS_TTL = 300s) are hardcoded module constants | `dynamic_page.service.ts (SLUG_TTL, BLOCKS_TTL)` | Cache freshness for published-page lookups and the editor's block list is identical for every tenant; a tenant with rapidly-changing marketing pages might want shorter TTLs while a static-site tenant prefers longer. Low priority — these are shared Redis-cache tuning knobs, not content, and a global default is reasonable. | `dynamicPageCacheTtlSeconds` |
| Default page status on create is hardcoded to DRAFT | `dynamic_page.dto.ts (CreatePageDTO.status default 'DRAFT')` | Whether newly created pages start as DRAFT vs PUBLISHED is an editorial-workflow choice that plausibly differs per tenant (e.g. a tenant with no review process may want PUBLISHED by default). Currently a fixed global default with no per-tenant override. | `dynamicPageDefaultStatus` |

---

## Dependencies

`requires`: `db`, `env`, `redis`, `logger`, `seo` (per `module.json`). The service also imports `SeoService` to delete the page's SEO meta row on page deletion.
