# Drive

- **id:** `drive`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/drive/`
- **tags:** content, files, storage
- **icon:** `fas fa-folder-open`
- **hasNextLayer:** true

Google Drive-like file manager over the storage module: nested folders, internal + public-link sharing, inline preview of common file types, trash bin (soft-delete + restore), a read-only view of all tenant storage objects, and drive:* extension points for community plugins (preview/action/source/lifecycle).

## Dependencies

- **requires:** `db`, `storage`, `common`, `env`
- **optional:** `marketplace`

## Services

- `drive.access.service.ts`
- `drive.crud.service.ts`
- `drive.preview.service.ts`
- `drive.share.service.ts`
- `drive.system.service.ts`
- `drive.upload.service.ts`

## DTOs

- `drive.dto.ts`

## Entities

- `drive_file.entity.ts`
- `drive_public_link.entity.ts`
- `drive_share.entity.ts`

## Enums

- `drive.enums.ts`

## Message keys

- `drive.messages.ts`

## TypeORM entities

- `DriveFile` (system) — `modules/drive/server/entities/drive_file.entity.ts`
- `DrivePublicLink` (system) — `modules/drive/server/entities/drive_public_link.entity.ts`
- `DriveShare` (system) — `modules/drive/server/entities/drive_share.entity.ts`

## Next layer (modules_next/) surface

- `drive/ui/drive-preview-modal.component` _(ui, client)_
- `drive/ui/drive-share-modal.component` _(ui, client)_
- `drive/ui/drive.page` _(ui, client)_
- `drive/ui/drive.types` _(ui)_

## README

# Drive

A Google Drive-like file manager built **on top of the `storage` module**. Drive
does not move bytes itself — it stores a lightweight overlay (`drive_files`) over
the storage layer's `UploadedFile` objects and adds the things a file manager
needs: folders, sharing, preview, and a trash bin.

## Features

- **Nested folders** — `drive_files` rows form a tree via `parentId`; files
  reference a storage object (`uploadedFileId` + `storageKey`).
- **Sharing**
  - *Internal*: share a node with another tenant user at `viewer` / `editor` /
    `owner` (`drive_shares`). Access inherits down the folder tree.
  - *Public link*: an unguessable, optionally-expiring token grants anonymous
    `viewer`/`editor` access to a single file (`drive_public_links`).
- **Preview** — short-lived presigned URLs power inline preview of images, PDFs,
  text, audio and video. Other types are download-only.
- **Trash bin** — delete soft-deletes a node (and its subtree) via
  `@DeleteDateColumn`; restore brings it back; "permanent" purges the rows *and*
  the underlying storage bytes.
- **Common / System Files** — an admin-only, read-only view of *every* storage
  object the tenant owns (avatars, invoices, gallery, …), with an "adopt to
  Drive" action.

## Architecture

```
ui/drive.page.tsx
        │  fetch
        ▼
/api/drive/*  (route handlers)
        │  auth (tenant_session) + drive.access.service
        ▼
drive.crud / upload / share / system services
        │
        ├── StorageService  (upload / presign / delete bytes)
        └── drive_files / drive_shares / drive_public_links  (overlay metadata)
```

Authorization is centralized in `drive.access.service`: `resolveEffectiveRole`
is a pure function (unit-tested) and `authorizeNode` walks the ancestor chain so
ownership/shares cascade. Tenant `ADMIN`/`OWNER` always resolve to `owner`.

## Extension points (plugins)

Drive hosts four `drive:*` extension points that community/external plugins
contribute into. Contributions run in the platform's sandboxed plugin isolate
and are reached host-side through the generic `listExternalContributions`
bridge — Drive never imports plugin code directly, and a plugin only ever
receives a short-lived **presigned URL**, never a storage secret.

| Point            | Kind     | Purpose                                                     |
| ---------------- | -------- | ----------------------------------------------------------- |
| `drive:preview`  | provider | Custom viewer for a MIME type/group (office, CAD, markdown) |
| `drive:action`   | provider | Custom per-file action (OCR, convert, export)               |
| `drive:source`   | provider | Mount an external backend as a virtual folder               |
| `drive:lifecycle`| hook     | React to upload/delete/move (thumbnails, indexing, AV)      |

The host-side contracts live in `server/drive.plugin-types.ts`; the wiring is in
`server/drive.plugins.ts`. See [PLUGIN_AUTHORING.md](./PLUGIN_AUTHORING.md) for a
worked example of writing a satellite plugin module.

## Notes / out of scope

- Drive inherits the storage layer's upload validation (size/extension/MIME, and
  the installed storage provider's allowlist). Supporting more file types is a
  storage-side concern, not a Drive change.
- Versioning, comments, drag-and-drop, and quota indicators are intentionally
  left for a later iteration.
