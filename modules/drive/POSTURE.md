# Drive — Security & Tenant Posture

## Tenant isolation
- Every entity (`drive_files`, `drive_shares`, `drive_public_links`) carries
  `tenantId`; every query filters on it and uses `tenantDataSourceFor(tenantId)`.
- The "Common / System Files" view reads only the calling tenant's
  `UploadedFile` rows and is gated to tenant `ADMIN`/`OWNER`.

## Authorization
- Centralized in `drive.access.service`. `resolveEffectiveRole` is pure and
  unit-tested; `authorizeNode` walks the ancestor chain so a share/ownership on
  a parent folder cascades to descendants.
- Role gates per operation: view = `viewer`, rename/move/upload = `editor`,
  delete/share/manage links = `owner`. Tenant `ADMIN`/`OWNER` ⇒ `owner`.

## Public links
- Tokens are 24 random bytes (`crypto.randomBytes`), stored per-file, optionally
  expiring. Revocation soft-deletes the row so a leaked token can be killed.
- The public route performs **no** tenant-session auth — possession of the token
  is the authorization — and only ever returns a short-lived presigned URL for a
  single file (never a folder, never bucket credentials).

## Storage / bytes
- Drive never holds storage secrets; all byte I/O goes through `StorageService`
  (upload/presign/hard-delete). Content MIME/size are read back from the
  authoritative `UploadedFile` row, never trusted from the client.
- Permanent delete purges both the overlay rows and the storage object
  (`StorageService.hardDeleteFile`).

## Plugins
- `drive:*` contributions run in the platform's sandboxed isolate via the
  generic external-contributions bridge. Plugins receive presigned URLs only.
- Failures are isolated: preview falls back to built-ins, actions are omitted,
  lifecycle hooks are best-effort.
