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

- `dynamic_page.service.ts`

## DTOs

- `dynamic_page.dto.ts`

## Entities

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
- `tenant` GET/POST `/tenant/[tenantId]/api/dynamic-pages/block-definitions`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/dynamic-pages/block-definitions/[blockId]`

## TypeORM entities

- `DynamicPage` (system) — `modules/dynamic_page/entities/dynamic_page.entity.ts`
- `DynamicPageBlock` (system) — `modules/dynamic_page/entities/dynamic_page_block.entity.ts`
- `DynamicPageTranslation` (system) — `modules/dynamic_page/entities/dynamic_page_translation.entity.ts`

## Next layer (modules_next/) surface

- `dynamic_page/dynamic/Blocks/CustomBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterColumns` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterCommerce` _(ui, client)_
- `dynamic_page/dynamic/Blocks/FooterMinimal` _(ui, client)_
- `dynamic_page/dynamic/Blocks/HeroBlock` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarCommerce` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarMarketing` _(ui, client)_
- `dynamic_page/dynamic/Blocks/NavBarSimple` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/animations` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/CloseBtn` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/constants` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/EditorPreview` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/index` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/PopupCard` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/PopupOverlay` _(ui, client)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/types` _(ui)_
- `dynamic_page/dynamic/Blocks/PopupModalBlock/utils` _(ui)_
- `dynamic_page/dynamic/Blocks/ProseBlock` _(ui, client)_
- `dynamic_page/dynamic/Editor/BackupModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/Canvas` _(ui, client)_
- `dynamic_page/dynamic/Editor/EditorTopBar` _(ui, client)_
- `dynamic_page/dynamic/Editor/index` _(ui, client)_
- `dynamic_page/dynamic/Editor/LeftSidebar` _(ui, client)_
- `dynamic_page/dynamic/Editor/PropsPanel` _(ui, client)_
- `dynamic_page/dynamic/Editor/RepeaterField` _(ui, client)_
- `dynamic_page/dynamic/Editor/RightSidebar` _(ui, client)_
- `dynamic_page/dynamic/Editor/SeoModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/ShortcutsModal` _(ui, client)_
- `dynamic_page/dynamic/Editor/stores/editorStore` _(ui)_
- `dynamic_page/dynamic/Editor/TranslationModal` _(ui, client)_
- `dynamic_page/dynamic/migrations/index` _(ui)_
- `dynamic_page/dynamic/partials/BaseBlock` _(ui, client)_
- `dynamic_page/dynamic/partials/BlockBackground` _(ui)_
- `dynamic_page/dynamic/partials/BlockErrorBoundary` _(ui, client)_
- `dynamic_page/dynamic/partials/BlockSkeleton` _(ui)_
- `dynamic_page/dynamic/partials/ClientBlockList` _(ui, client)_
- `dynamic_page/dynamic/partials/PreviewContext` _(ui, client)_
- `dynamic_page/dynamic/partials/TemplateBlockRenderer` _(ui, client)_
- `dynamic_page/dynamic/types` _(ui)_
- `dynamic_page/dynamic/utils/BlockBg` _(util)_
- `dynamic_page/dynamic/utils/BlockRegistry` _(util)_
- `dynamic_page/DynamicPageRenderer` _(ui)_
- `dynamic_page/PublicDynamicPage` _(ui)_
- `dynamic_page/SiteChrome` _(ui)_
