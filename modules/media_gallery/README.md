# media_gallery

Polymorphic ordered image gallery attachable to any entity (`store_product`, `store_category`, `store_bundle`, `store_variant`, …).

## Model

- `MediaGallery` — one per `(tenantId, entityType, entityId)` triple. Owns the items.
- `MediaGalleryItem` — **wrapper around `storage.UploadedFile`**. Stores only gallery-side overlay:
  - `uploadedFileId` (FK → `UploadedFile.uploadedFileId`, same tenant DB)
  - `altText`, `title`, `sortOrder`, `isPrimary`

The actual photo bytes (`url`, `key`, `mimeType`, `size`, `bucket`, `provider`) live on `UploadedFile` and are the single source of truth. Read endpoints join the two and return a `MediaGalleryItemView` shape (`item fields … + url + mimeType`) so the client can render without a second hop.

## Flow (UI → API)

1. UI uploads the raw file → `POST /tenant/:tenantId/api/storage` (returns `uploadedFileId`).
2. UI attaches the upload to a gallery → `POST /tenant/:tenantId/api/media-gallery/:entityType/:entityId/items` with `{ uploadedFileId, altText?, title?, sortOrder?, isPrimary? }`.
3. UI lists → `GET /tenant/:tenantId/api/media-gallery/:entityType/:entityId/items` returns items with resolved `url`/`mimeType`.

## Why a wrapper, not a copy?

`UploadedFile` already carries the auditable storage truth (bucket, provider, soft-delete timestamp, billing-relevant `size`). Duplicating `url`/`mimeType` on `MediaGalleryItem` would drift the moment a CDN base changes or a file is soft-deleted. The wrapper keeps gallery-only state on the gallery row and lets the storage row stay authoritative.

## Cache

`gallery:<tenantId>:<entityType>:<entityId>` (Redis single-flight) — invalidated on add/update/remove/reorder.
