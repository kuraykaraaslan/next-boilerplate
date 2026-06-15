# Media Gallery

- **id:** `media_gallery`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/media_gallery/`
- **tags:** media, gallery, images
- **icon:** `fas fa-images`
- **hasNextLayer:** true

Polymorphic ordered image gallery attachable to any entity type. Items wrap UploadedFile rows (storage module) and add gallery-side overlay: sortOrder, isPrimary, altText, title.

## Dependencies

- **requires:** `db`, `redis`, `storage`

## Services

- `media_gallery.intelligence.service.ts`
- `media_gallery.service.ts`

## DTOs

- `media_gallery.dto.ts`

## Entities

- `media_gallery.entity.ts`
- `media_gallery_item.entity.ts`

## Enums

- `media_gallery.enums.ts`

## Message keys

- `media_gallery.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/media-gallery/[entityType]/[entityId]/items`
- `tenant` PUT `/tenant/[tenantId]/api/media-gallery/[entityType]/[entityId]/items/reorder`
- `tenant` PUT/DELETE `/tenant/[tenantId]/api/media-gallery/items/[itemId]`

## TypeORM entities

- `MediaGallery` (system) — `modules/media_gallery/entities/media_gallery.entity.ts`
- `MediaGalleryItem` (system) — `modules/media_gallery/entities/media_gallery_item.entity.ts`

## Next layer (modules_next/) surface

- `media_gallery/ui/GalleryPanel` _(ui, client)_

## README

# Media Gallery Module

Polymorphic ordered image gallery attachable to any store entity (`store_product`, `store_category`, `store_bundle`, `store_variant`). Each gallery item is a thin **wrapper around a `storage.UploadedFile` row** — it carries only the gallery-side overlay (`altText`, `title`, `sortOrder`, `isPrimary`) while the photo bytes stay authoritative on the storage row.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `MediaGallery` | `media_galleries` | One per `(tenantId, entityType, entityId)` triple (`@Unique`). Owns the items. |
| `MediaGalleryItem` | `media_gallery_items` | Wrapper around an `UploadedFile`. Holds `uploadedFileId` (FK → `UploadedFile`, `onDelete: CASCADE`, same tenant DB) plus `altText`, `title`, `sortOrder`, `isPrimary`. |

Both live in the **tenant DB**. Every row carries a `tenantId` column.

The actual photo data (`url`, `key`, `mimeType`, `size`, `bucket`, `provider`) lives on `UploadedFile` and is the single source of truth. Read paths join the two and return a `MediaGalleryItemView` (`item fields … + url + mimeType`) so the client can render without a second hop to `/api/storage`.

### Why a wrapper, not a copy?

`UploadedFile` already carries the auditable storage truth (bucket, provider, soft-delete timestamp, billing-relevant `size`). Duplicating `url`/`mimeType` on `MediaGalleryItem` would drift the moment a CDN base changes or a file is soft-deleted. The wrapper keeps gallery-only state on the gallery row and lets the storage row stay authoritative.

---

## Service — `MediaGalleryService`

All methods are `static`, resolve the per-tenant DataSource via `tenantDataSourceFor(tenantId)`, and scope every read/write by `tenantId`.

| Method | Responsibility |
|---|---|
| `getOrCreate(tenantId, entityType, entityId)` | Find or lazily create the gallery for the `(tenantId, entityType, entityId)` triple. |
| `listItems(tenantId, entityType, entityId)` | Return the gallery with its items as `MediaGalleryItemView[]` (joined `url`/`mimeType`), ordered `isPrimary DESC, sortOrder ASC`. Wrapped in a Redis `singleFlight` on the cache key. |
| `addItem(tenantId, entityType, entityId, dto)` | Validate the `uploadedFileId` belongs to the tenant (else `UPLOADED_FILE_NOT_FOUND`), unset any existing primary if `isPrimary`, insert the item, invalidate the cache. |
| `updateItem(tenantId, itemId, dto)` | Patch overlay fields (`altText`/`title`/`sortOrder`/`isPrimary`); demotes the existing primary when `isPrimary` is set. Invalidates the cache. |
| `removeItem(tenantId, itemId)` | Delete the item row (the `UploadedFile` is untouched). Invalidates the cache. |
| `reorder(tenantId, galleryId, dto)` | Rewrite `sortOrder` from the position of each id in `orderedIds`. Invalidates the cache. |
| `_invalidate` *(private)* | Resolve the gallery, then `redis.del` its cache key. |

### Flow (UI → API)

1. UI uploads the raw file → `POST /tenant/:tenantId/api/storage` (returns `uploadedFileId`).
2. UI attaches the upload to a gallery → `POST …/media-gallery/:entityType/:entityId/items` with `{ uploadedFileId, altText?, title?, sortOrder?, isPrimary? }`.
3. UI lists → `GET …/media-gallery/:entityType/:entityId/items` returns items with resolved `url`/`mimeType`.

### Cache

`gallery:<tenantId>:<entityType>:<entityId>` (Redis single-flight) — invalidated on add/update/remove/reorder.

---

## API Routes

All routes are tenant-scoped, rate-limited (`Limiter.checkRateLimit`), and require **tenant `ADMIN`** (`authenticateTenantByRequest`, `requiredTenantRole: 'ADMIN'`).

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/media-gallery/[entityType]/[entityId]/items` | List the gallery + items (`MediaGalleryItemView`). |
| POST | `/tenant/[tenantId]/api/media-gallery/[entityType]/[entityId]/items` | Add an item (`AddGalleryItemDTO`). Returns `201`. |
| PUT | `/tenant/[tenantId]/api/media-gallery/[entityType]/[entityId]/items/reorder` | Reorder items — body merges `{ galleryId }` with `ReorderGalleryItemsDTO`. |
| PUT | `/tenant/[tenantId]/api/media-gallery/items/[itemId]` | Update an item (`UpdateGalleryItemDTO`). |
| DELETE | `/tenant/[tenantId]/api/media-gallery/items/[itemId]` | Remove an item. |

### DTOs

| DTO | Fields |
|---|---|
| `AddGalleryItemDTO` | `uploadedFileId` (uuid), `altText?` (≤300), `title?` (≤200), `sortOrder` (int ≥0, default 0), `isPrimary` (bool, default false) |
| `UpdateGalleryItemDTO` | `altText?`, `title?`, `sortOrder?`, `isPrimary?` (all optional) |
| `ReorderGalleryItemsDTO` | `orderedIds` (uuid[], min 1) |

`GalleryEntityTypeEnum` (`media_gallery.enums.ts`) constrains `entityType` to `store_category`, `store_product`, `store_bundle`, `store_variant`.

---

## Settings

This module exposes **no per-tenant or system settings** and no provider/policy branching. All behavior is uniform across tenants; isolation is purely data-level via `tenantId`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A polymorphic ordered image-gallery module that attaches tenant-scoped galleries/items (overlay on storage UploadedFile rows) to store entities; fully per-tenant in data (every row carries tenantId and is accessed via tenantDataSourceFor) but exposes no configurable per-tenant or system settings and no provider/policy branching.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `MediaGallery` | `media_galleries` | entityType, entityId |
| `MediaGalleryItem` | `media_gallery_items` | galleryId, uploadedFileId, altText, title, sortOrder, isPrimary |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `media_gallery.service.ts` — Every method (getOrCreate/listItems/addItem/updateItem/removeItem/reorder/_invalidate) resolves the per-tenant DB via tenantDataSourceFor(tenantId) and scopes all reads/writes by tenantId, so each tenant sees and mutates only its own galleries, items, and the wrapped UploadedFile rows; the redis cache key (gallery:{tenantId}:{entityType}:{entityId}) is also namespaced per tenant. This is uniform tenant isolation, not setting-driven branching.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Allowed gallery entity types are a globally hardcoded enum (store_category, store_product, store_bundle, store_variant) with no way for a tenant to enable a different set | `media_gallery.enums.ts:GalleryEntityTypeEnum` | Which entity types a tenant can attach galleries to is a plausible per-tenant feature/policy knob; today it is a single global zod enum validated identically for all tenants. Could legitimately be global if entity types are platform-defined, but it is the only obvious variability gap. | `galleryAllowedEntityTypes` |
| No per-gallery item-count cap; addItem appends items with no maximum enforced | `media_gallery.service.ts:addItem` | A max-images-per-gallery limit is a common per-tenant/plan policy (e.g. free vs paid tiers); the service applies no limit at all today, so all tenants get unbounded items. | `galleryMaxItemsPerGallery` |

---

## Dependencies

`db`, `redis`, `storage` (declared in `module.json`). Items FK into `storage.UploadedFile` in the same tenant DB.
