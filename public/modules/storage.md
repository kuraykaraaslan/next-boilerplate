# File Storage

- **id:** `storage`
- **tier:** platform
- **version:** 1.1.0
- **dir:** `modules/storage/`
- **tags:** platform, storage, security
- **icon:** `fas fa-cloud-arrow-up`
- **hasNextLayer:** false

Pluggable S3-compatible file storage (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO) with content-derived MIME validation and optional online virus scanning (VirusTotal).

## Dependencies

- **requires:** `env`, `setting`
- **optional:** `redis`, `tenant_usage`, `user_agent`

## Services

- `storage.scan.service.ts`
- `storage.service.ts`

## DTOs

- `storage.dto.ts`

## Entities

- `uploaded_file.entity.ts`

## Enums

- `storage.enums.ts`
- `storage.scan.enums.ts`

## Message keys

- `storage.messages.ts`

## Setting keys

- `storage.scan.setting.keys.ts`
- `storage.setting.keys.ts`

## Jobs

- `storage.scan.job.ts`

## Owned API routes

- `tenant` POST `/tenant/[tenantId]/api/storage`

## TypeORM entities

- `UploadedFile` (system) — `modules/storage/server/entities/uploaded_file.entity.ts`

## README

# Storage Module

Multi-provider, tenant-aware cloud storage abstraction. A unified S3-compatible API for upload (multipart `File` or from URL), delete, and URL generation across AWS S3, Cloudflare R2, DigitalOcean Spaces and MinIO. Each tenant resolves its own provider, bucket and credentials from Setting rows; every successful upload is recorded in a per-tenant `UploadedFile` audit ledger and metered against the tenant's storage quota.

---

## Entities

| Entity | Table | DB | Description |
|---|---|---|---|
| `UploadedFile` | `uploaded_files` | tenant | Immutable audit row per successful upload (`key`, `bucket`, `provider`, `size`, `mimeType`, `url`, `userId`). Soft-deleted (`deletedAt`) on delete; joined with `TenantUsage.storageBytes` for billing/quota. Indexed on `tenantId`, `userId`, `key`. |

---

## Files

| File | Purpose |
|---|---|
| `storage.service.ts` | Core: per-tenant provider resolution, feature-gating, upload (`uploadFile` / `uploadFromUrl`), `deleteFile`, `getFileUrl`, audit persistence |
| `storage.types.ts` | `UploadOptions`, `UploadFromUrlOptions`, `ProviderUploadResult`, `UploadResult`, `S3Config` |
| `storage.dto.ts` | `UploadFileDTO`, `UploadFromUrlDTO`, `DeleteFileDTO`, `GetFileUrlDTO` |
| `storage.enums.ts` | `StorageProviderType`, `StorageFolder`, `StorageExtension`, `StorageMimeType` |
| `storage.folders.ts` | Runtime folder registry (`registerStorageFolder`, `isValidStorageFolder`) — modules add folders without editing the core enum |
| `storage.mime-groups.ts` | MIME group definitions + `expandMimeGroups` (group → MIME types) |
| `storage.validation.ts` | Pre-upload validation: size, extension allowlist, magic-byte sniffing, EXIF strip, content-derived MIME (`deriveMimeType`) + `allowedMimeTypes` allowlist |
| `storage.messages.ts` | Error/success message strings |
| `storage.setting.keys.ts` | `STORAGE_KEYS` setting key constants |
| `storage.scan.setting.keys.ts` | `STORAGE_SCAN_KEYS` virus-scan setting key constants |
| `storage.scan.enums.ts` | `VirusScanProvider`, `VirusScanStatus`, `VirusScanMode`, `VirusScanInfectedAction` |
| `storage.scan.types.ts` | `ScanConfig`, `ScanResult` |
| `storage.scanner-factory.ts` | `getScanConfig(tenantId)` + `createScanner(config)` |
| `storage.scan.service.ts` | `scan(config, bytes, filename)` + `handleInfected(...)` (quarantine/delete) |
| `storage.scan.job.ts` | BullMQ async scan queue/worker + `enqueueVirusScan` |
| `scanners/base.scanner.ts` | Abstract `FileScanner` base class |
| `scanners/virustotal.scanner.ts` | VirusTotal v3 adapter |
| `storage.seed.ts` | Demo seed for the `UploadedFile` ledger (5 providers, 1 soft-deleted) |
| `s3.client.ts` | Shared `@aws-sdk/client-s3` client built from `env` (env-level credentials) |
| `entities/uploaded_file.entity.ts` | `UploadedFile` audit entity |
| `providers/base.provider.ts` | Abstract `BaseStorageProvider` base class |
| `providers/aws-s3.provider.ts` | AWS S3 |
| `providers/cloudflare-r2.provider.ts` | Cloudflare R2 |
| `providers/digitalocean-spaces.provider.ts` | DigitalOcean Spaces |
| `providers/minio.provider.ts` | MinIO (self-hosted) |

---

## Service / Responsibilities

`StorageService` (default export) is fully tenant-scoped — every public method takes `tenantId`:

| Method | Responsibility |
|---|---|
| `uploadFile(tenantId, data)` | Feature-gate, resolve the tenant's provider, upload a `File`, persist the audit row, return `UploadResult` (with `uploadedFileId`). |
| `uploadFromUrl(tenantId, data)` | Same as above but fetches the bytes from a remote URL. |
| `deleteFile(tenantId, data)` | Delete the object from the bucket and soft-remove the matching `UploadedFile` audit row. |
| `getFileUrl(tenantId, data)` | Return the object URL from the tenant's resolved provider. |

Private helpers:

- `getStorageSettings(tenantId)` — reads `STORAGE_KEYS` via `SettingService.getByKeys` and builds the per-tenant `S3Config` (provider, bucket, region, credentials, endpoint).
- `createProvider(name, config)` — maps the resolved provider name to the concrete provider class.
- `getProvider(tenantId, providerName?)` — resolves the tenant default provider unless the request explicitly overrides it.
- `persistUploadAudit(...)` — best-effort: writes the `UploadedFile` row into the tenant DataSource and increments `TenantUsageService.incrementStorageBytes`. Failures are logged, never thrown.
- `assertStorageFeatureAccess(tenantId)` — defense-in-depth billing gate (see *Security*).

---

## Providers

The active provider is resolved per tenant from the `storageProvider` setting (or overridden per request via the DTO `provider` field). Each provider extends `BaseStorageProvider` and implements `uploadFile`, `uploadFromUrl`, `deleteFile`, `getFileUrl`.

`StorageProviderType` values: `aws-s3`, `s3`, `cloudflare-r2`, `digitalocean-spaces`, `minio`. The service `createProvider` switch routes `aws-s3`, `cloudflare-r2`, `digitalocean-spaces` and `minio` to their classes (an unmapped name throws `PROVIDER_NOT_FOUND`).

### Adding a New Provider

1. Extend `BaseStorageProvider` in `providers/`
2. Add the value to `StorageProviderTypeSchema` in `storage.enums.ts`
3. Register it in the `createProvider` switch in `storage.service.ts`
4. Add any new setting keys in `storage.setting.keys.ts`

---

## API Routes

| Method | Path | Scope | Description |
|---|---|---|---|
| POST | `/tenant/[tenantId]/api/storage` | tenant, authenticated | Multipart upload (`FormData`: `file`, optional `folder` default `general`, optional `provider`). Rate-limited (`api`). Returns `uploadedFileId`, `url`, `key`, `bucket`, `size`, `provider`. |

Storage settings are read/written through the shared admin-settings surface (`GET/PUT /tenant/[tenantId]/api/admin-settings`), not a storage-specific route.

---

## Usage

```typescript
import StorageService from '@/modules/storage/storage.service';

// Upload a file (tenantId-first)
const result = await StorageService.uploadFile(tenantId, {
  file,
  folder: 'users',
  filename: `${userId}.webp`,
  tenantId,
});
// result.url, result.key, result.bucket, result.size, result.provider, result.uploadedFileId

// Upload from a remote URL
const fromUrl = await StorageService.uploadFromUrl(tenantId, {
  url: 'https://example.com/avatar.png',
  folder: 'users',
});

// Delete a file (soft-deletes the audit row)
await StorageService.deleteFile(tenantId, { key: result.key });

// Get the object URL
const url = await StorageService.getFileUrl(tenantId, { key: result.key });
```

### Upload Result

```typescript
type UploadResult = {
  url: string;
  key: string;
  bucket: string;
  size?: number;
  provider: StorageProviderType;
  uploadedFileId?: string;
};
```

---

## Usage tracking & audit

Every successful upload:

1. Inserts an `UploadedFile` row in the tenant DB (`entities/uploaded_file.entity.ts`) — `key`, `bucket`, `provider`, `size`, `mimeType`, `url`, `userId`, `createdAt`, plus upload origin (`ipAddress`, `userAgent`, `country` inferred from the IP) and scan columns (`scanStatus`, `scanProvider`, `scanResult`, `scannedAt`). The row is keyed by `tenantId` and indexed on `userId`/`key`/`country`.
2. Calls `TenantUsageService.incrementStorageBytes(tenantId, result.size)` so the `storageBytes` quota counter (`tenant_usage`) tracks reality.

`deleteFile` soft-removes the matching `UploadedFile` row (`deletedAt` set) — the byte counter is increment-only (audit-friendly; decrement is a future task).

Audit / usage failures are swallowed — they never break the upload itself (the bytes are already in the bucket at that point).

---

## Settings

Storage setting keys (`STORAGE_KEYS`, declared in `storage.setting.keys.ts`) are seeded per tenant under the `Storage` group in `setting/setting.seed.ts` and read at runtime by `storage.service.ts` via `SettingService.getByKeys`.

| Key | Type | Default | Read in / Notes |
|---|---|---|---|
| `storageProvider` | string | `s3` (seed) / `aws-s3` (service fallback) | `storage.service.ts` — selects the backend (`aws-s3` \| `s3` \| `cloudflare-r2` \| `digitalocean-spaces` \| `minio`). |
| `s3Bucket` | string | — | `storage.service.ts` — destination bucket. |
| `s3Region` | string | `us-east-1` | `storage.service.ts` — bucket region. |
| `s3AccessKey` | string | — | `storage.service.ts` — credential access key id. |
| `s3SecretKey` | string | — | `storage.service.ts` — credential secret key. |
| `s3Endpoint` | string | — | `storage.service.ts` — custom endpoint (R2 / Spaces / MinIO); undefined falls back to provider default. |
| `maxFileSizeMb` | number | `25` | `getValidationPolicy` — enforced in `validateUpload`. |
| `allowedExtensions` | json | `["png","jpg","pdf"]` | `getValidationPolicy` — enforced in `validateUpload`. |
| `allowedMimeGroups` | csv | `images,documents` | `getValidationPolicy` — group keys expanded to MIME types (see below). |
| `allowedMimeTypes` | csv | — (empty) | `getValidationPolicy` — explicit MIME types added on top of the selected groups. |
| `imageStripExif` | bool | `true` | `getValidationPolicy` — strips JPEG EXIF/metadata unless `'false'`. |

#### MIME allowlist by group (`storage.mime-groups.ts`)

Rather than listing raw MIME strings, tenants pick **groups**; the effective
allowlist is `expandMimeGroups(allowedMimeGroups) ∪ allowedMimeTypes`. Both empty
⇒ unrestricted (provider-level type checks still apply). The content-derived MIME
(`deriveMimeType`) is matched against this set in `validateUpload`.

| Group | Covers |
|---|---|
| `images` | jpeg, png, webp, avif, gif, bmp, ico, svg |
| `documents` | pdf, txt, markdown, html, docx, odt, epub |
| `spreadsheets` | csv, xlsx, ods |
| `presentations` | pptx |
| `archives` | zip, gzip |
| `audio` | mpeg/mp3 |
| `video` | mp4 |
| `data` | json, xml, yaml |

### Virus scanning keys (`STORAGE_SCAN_KEYS`, `storage.scan.setting.keys.ts`)

| Key | Type | Default | Notes |
|---|---|---|---|
| `virusScanEnabled` | bool | `false` | Master switch; also requires `virusScanApiKey` to take effect. |
| `virusScanMode` | enum | `async` | `sync` blocks the upload until scanned; `async` scans in the background. |
| `virusScanProvider` | enum | `virustotal` | Online scanner backend. |
| `virusScanApiKey` | string | — | Provider API key (secret). |
| `virusScanTimeoutSeconds` | number | `30` | Per-scan time budget. |
| `virusScanInfectedAction` | enum | `quarantine` | `quarantine` (move to quarantine folder) or `delete`. |
| `virusScanQuarantineFolder` | string | `quarantine` | Destination folder prefix for quarantined objects. |

`s3.client.ts` builds a separate, env-credentialed `@aws-sdk/client-s3` instance from `env` (`AWS_REGION`/`AWS_ACCESS_KEY_ID`/…) — independent of the per-tenant Setting credentials above.

---

## Security

`assertStorageFeatureAccess(tenantId)` gates `uploadFile` / `uploadFromUrl` before any provider work:

- Short-circuits for the root tenant (`isRootTenant`).
- Asserts the tenant's active plan grants `FEATURE_STORAGE_UPLOAD` (boolean).
- Asserts `FEATURE_STORAGE_QUOTA_BYTES` (limit) is not exhausted, comparing against the tenant's `TenantUsage.storageBytes`.

The quota check is best-effort and non-atomic — the post-upload byte increment can briefly push usage above the ceiling under concurrent uploads.

### Upload validation & MIME

`validateUpload` (`storage.validation.ts`) runs before the bytes reach the bucket:
size (`maxFileSizeMb`), extension allowlist (`allowedExtensions`), magic-byte
sniffing, optional EXIF stripping, and a **content-derived MIME** check. The real
MIME is derived from the verified content (`deriveMimeType`) — never the client's
`file.type` header — and matched against the per-tenant `allowedMimeTypes`
allowlist; the derived MIME is what gets stored on the object and audit row.

### Virus scanning

When `virusScanEnabled` (+ `virusScanApiKey`) is set, uploads are scanned via a
pluggable online scanner (`scanners/`, first adapter VirusTotal):

- **sync** (`virusScanMode=sync`) — the buffer is scanned before the bucket write;
  an infected file is rejected with `SCAN_INFECTED` and never stored.
- **async** (default) — the object is stored as `scanStatus='pending'` and a BullMQ
  job (`storage.scan.job.ts`) downloads it via a presigned URL, scans it, writes the
  result to the `UploadedFile` scan columns, then quarantines/deletes it if infected
  (`virusScanInfectedAction`). `uploadFromUrl` always scans asynchronously;
  `uploadServerBuffer` (trusted server output) is not scanned.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The storage module uploads/deletes files to S3-compatible providers (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO) and is fully tenant-aware: each real tenant has its own provider, bucket, credentials and limits in Setting rows, its own UploadedFile audit ledger, and upload access is gated per-tenant via subscription feature-keys + a storage quota.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `storageProvider` | string | `aws-s3` | tenant | Which S3-compatible backend the tenant's uploads go to (aws-s3 \| s3 \| cloudflare-r2 \| digitalocean-spaces \| minio); service default 'aws-s3', seed default 's3'. | `storage.service.ts` |
| `s3Bucket` | string | — | tenant | Destination bucket name for this tenant's objects. | `storage.service.ts` |
| `s3Region` | string | `us-east-1` | tenant | AWS/S3 region for the tenant's bucket. | `storage.service.ts` |
| `s3AccessKey` | string | — | tenant | Access key id for the tenant's storage credentials. | `storage.service.ts` |
| `s3SecretKey` | string | — | tenant | Secret access key for the tenant's storage credentials. | `storage.service.ts` |
| `s3Endpoint` | string | — | tenant | Custom S3 endpoint URL (for R2 / Spaces / self-hosted MinIO); undefined falls back to provider default. | `storage.service.ts` |
| `maxFileSizeMb` | number | `25` | tenant | Intended per-tenant max upload size in MB (seeded/UI-editable but not yet enforced in the service). | `setting.seed.ts` |
| `allowedExtensions` | json | `["png","jpg","pdf"]` | tenant | Intended per-tenant allowlist of upload file extensions (seeded/UI-editable but not yet enforced in the service). | `setting.seed.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `UploadedFile` | `uploaded_files` | userId, key, bucket, provider, size, mimeType, url |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `storage.service.ts:getStorageSettings` — Reads storageProvider + s3Bucket/region/credentials/endpoint via SettingService.getByKeys(tenantId,...) so the resolved provider and S3Config are entirely per-tenant; each tenant uploads to its own bucket with its own credentials.
- `storage.service.ts:getProvider` — Selects the concrete provider class (AWS S3 / R2 / Spaces / MinIO) from the tenant's resolved storageProvider setting, unless the request explicitly overrides it.
- `storage.service.ts:assertStorageFeatureAccess` — Gates uploadFile/uploadFromUrl per tenant: asserts the tenant's active plan grants FEATURE_STORAGE_UPLOAD and that FEATURE_STORAGE_QUOTA_BYTES is not exhausted (compared against the tenant's TenantUsage.storageBytes). Root tenant is short-circuited (isRootTenant).
- `storage.service.ts:persistUploadAudit` — Writes the UploadedFile audit row into tenantDataSourceFor(tenantId) and increments TenantUsageService.storageBytes for that tenant, so each tenant has its own file ledger and usage counter.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Per-tenant max upload size is not enforced; uploadFile/uploadFromUrl accept any file size regardless of the tenant's configured limit. | `storage.service.ts:uploadFile / uploadFromUrl` | The maxFileSizeMb setting is declared in storage.setting.keys.ts, seeded per-tenant (value '25'), and exposed in the settings UI, but it is never read anywhere in the service — uploads are size-gated only by the subscription quota, not this per-tenant ceiling. | `maxFileSizeMb` |
| Per-tenant allowed file extensions are not enforced; any extension/mime type is accepted on upload. | `storage.service.ts:uploadFile / uploadFromUrl` | allowedExtensions is declared in storage.setting.keys.ts and seeded per-tenant (['png','jpg','pdf']) and UI-editable, but no code reads it to validate the uploaded file's extension. | `allowedExtensions` |

---

## Dependencies

Requires `env` and `setting` (per `module.json`). At runtime also uses `tenant_usage` (quota counter), `tenant_subscription` (feature-key gating), `tenant`/`db` (per-tenant DataSource), and `logger`.
