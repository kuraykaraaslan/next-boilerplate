# storage — Posture Review

> **Uygulandı:** 2026-06-10 — High AppError (createProvider), Medium incrementStorageBytes try/catch içine alındı, Medium data.tenantId override kaldırıldı (her zaman authenticated tenantId kullanılıyor).

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** storage.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| storage.service.ts | 238 | Facade over S3-compatible storage providers; resolves per-tenant provider/config from SettingService, gates uploads on subscription features/quota, uploads/deletes objects, and persists `UploadedFile` audit rows + tenant storage-bytes usage. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` instead of `AppError`** — `createProvider` throws a bare `Error` for an unknown provider; a route handler cannot derive an HTTP status/`ErrorCode` from it (it surfaces as a generic 500). Evidence: `modules/storage/storage.service.ts:58`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(STORAGE_MESSAGES.PROVIDER_NOT_FOUND, 400, ErrorCode.VALIDATION_ERROR)` imported from `@/modules/common/app-error`.
- **[Dimension 12 — Security hardening] SSRF in `uploadFromUrl` — unvalidated user-controlled fetch** — `uploadFromUrl(tenantId, data)` passes the caller-supplied `data.url` straight to the provider, which does a raw `fetch(url)` with no scheme/host allowlist and no private-IP/metadata-endpoint block. A tenant user can make the server fetch `http://169.254.169.254/...` or internal hosts (cloud metadata / internal services). Evidence: `modules/storage/storage.service.ts:177` → `modules/storage/providers/aws-s3.provider.ts:99`. Rule: `security-hardening.md`, `secure-api-and-input-validation.md`. Fix: before fetching, validate the URL is `https`, resolve and reject RFC1918/loopback/link-local/metadata IPs, and cap response size; centralize this in the service rather than per-provider.

### 🟡 Medium
- **[Dimension 6 — Multi-tenancy] Caller-overridable object-key tenant prefix** — `effectiveTenantId = data.tenantId || tenantId` lets the request body override the tenant prefix used to build the bucket object key, so a caller could write objects under another tenant's key namespace in the shared bucket. The DB audit row and feature gate correctly use the authenticated `tenantId`, so there is no cross-tenant DB leak (not Critical), but the storage layout is no longer isolated. Evidence: `modules/storage/storage.service.ts:146,150,173,177`. Rule: `multi-tenancy-patterns.md`. Fix: drop `data.tenantId` and always derive the prefix from the authenticated `tenantId`.
- **[Dimension 2 — Boundary validation] No `Safe*Schema` on returned data** — `uploadFile`/`uploadFromUrl`/`getFileUrl` return provider/DB-derived values directly; there is no `SafeUploadResultSchema.parse(...)` filtering output before it leaves the service. Evidence: `modules/storage/storage.service.ts:159,186,232`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: define a `Safe*Schema` for the result shape and parse outbound payloads.
- **[Dimension 11 — Logging and audit] No audit-trail entry for upload/delete** — meaningful mutating actions (upload, delete) are only `Logger`-traced; nothing is written to the audit_log module fire-and-forget. The `UploadedFile` row is a usage/billing record, not an actor-attributed security audit event, and `deleteFile` records no actor at all. Evidence: `modules/storage/storage.service.ts:157,199`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log entry (actor, action, key) for uploads and deletes.
- **[Dimension 3 — Error handling] Usage increment can fail a "best-effort" upload** — `persistUploadAudit` documents itself as best-effort, but the `incrementStorageBytes` call sits outside the try/catch, so a usage-counter failure throws and propagates out of `uploadFile`/`uploadFromUrl` after the object is already in the bucket (and possibly the audit row already saved). Evidence: `modules/storage/storage.service.ts:109-111`. Rule: `error-handling-and-app-error.md`. Fix: wrap the increment in the same best-effort try/catch and log on failure.

### 🔵 Low
- **[Dimension 13 — Naming] Setting-keys file suffix inconsistency** — the key file is `storage.setting.keys.ts` (singular `setting`) whereas the codebase convention elsewhere is `*.settings.fields.ts`/`*.settings.keys.ts`. Cosmetic only. Evidence: `modules/storage/storage.setting.keys.ts:1`. Rule: `naming-conventions.md`, `file-organization.md`. Fix: align the suffix with the prevailing convention if standardizing.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class StorageService`, all-static, never instantiated. |
| 2 | Boundary validation | ⚠️ | Input typed via DTOs (Zod at route); no `Safe*Schema` filtering on returned data. |
| 3 | Error handling | ❌ | Raw `throw new Error` at line 58; best-effort increment outside try/catch (line 110). |
| 4 | Messages pattern | ✅ | Uses `storage.messages.ts`; no hardcoded user-facing strings in the service. |
| 5 | DB access and ownership | ✅ | DB only in service, `UploadedFile` in `entities/`, null-checked findOne, soft-remove, no raw SQL. |
| 6 | Multi-tenancy | ⚠️ | Correct `tenantDataSourceFor`, queries filtered by `tenantId`; but `data.tenantId` can override the object-key prefix. |
| 7 | Authorization / RBAC | ⚠️ | Feature/quota gating present; authz enforced at route layer; resource-level ownership check (e.g. delete-by-key) not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | Providers hidden behind facade; cross-module deps (Setting, TenantUsage, FeatureGate) via `@/` facades, no cycles. |
| 9 | Caching | — | No hot read path requiring cache; N/A. |
| 10 | Secrets and config | ✅ | Credentials read via SettingService; no `process.env.X` in the service. |
| 11 | Logging and audit | ⚠️ | Logger tracing present; no fire-and-forget audit-log entry for upload/delete. |
| 12 | Security hardening | ❌ | SSRF: user-controlled URL fetched with no host/IP allowlist or size cap. |
| 13 | Naming and file org | ✅ | snake_case module, kebab/dotted files, PascalCase class; minor setting-keys suffix nit (Low). |

## Recommendations
1. Add SSRF defense to `uploadFromUrl`: enforce `https`, block private/loopback/link-local/metadata IPs after DNS resolution, and cap downloaded size — ideally in the service before delegating to a provider.
2. Replace `throw new Error` in `createProvider` with `AppError(..., 400, ErrorCode.VALIDATION_ERROR)`.
3. Stop honoring `data.tenantId`; always derive the object-key prefix from the authenticated `tenantId` to keep bucket layout tenant-isolated.
4. Move the `incrementStorageBytes` call inside the best-effort try/catch so usage-counter failures never fail an already-completed upload.
5. Filter outbound results through a `Safe*Schema` and emit fire-and-forget audit-log entries (with actor) for upload and delete.

## References
- Rules: `error-handling-and-app-error.md`, `security-hardening.md`, `secure-api-and-input-validation.md`, `multi-tenancy-patterns.md`, `validation-philosophy.md`, `logging-monitoring-and-audit-trails.md`, `authorization-and-rbac.md` · Source: `modules/storage/storage.service.ts`, `modules/storage/providers/aws-s3.provider.ts`, `modules/storage/storage.dto.ts`, `modules/storage/storage.types.ts`, `modules/storage/entities/uploaded_file.entity.ts`
