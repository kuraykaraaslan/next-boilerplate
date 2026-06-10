# e_signature — Posture Review

> **Uygulandı:** 2026-06-10 — Critical SettingService.create arg fix, High AppError (tüm throws → AppError across 6 files), Medium ESignatureService_isEncrypted → ESignatureEncryptionService.isEncrypted, Medium inline strings (CERT_DER_DECODE_FAILED, OCSP_RESPONSE_DECODE_FAILED, ENCRYPTED_VALUE_FORMAT_INVALID, ENCRYPTED_VALUE_AUTH_TAG_INVALID) messages.ts'e taşındı.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** e_signature.cert.service.ts, e_signature.crypto.service.ts, e_signature.encryption.service.ts, e_signature.etsi_tsl.service.ts, e_signature.identity.service.ts, e_signature.ocsp.service.ts, e_signature.service.ts, e_signature.settings.service.ts, e_signature.trust_list.service.ts
> **Overall grade:** D · **Findings:** 1c / 4h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| e_signature.service.ts | 533 | Facade/orchestrator: provider registry, challenge/transaction lifecycle (Redis), initiate + poll, user matching, webhook dispatch. |
| e_signature.cert.service.ts | 118 | Bound signing-certificate persistence (find/bind/markUsed/revoke), national-id hashing, entity→DTO map. |
| e_signature.crypto.service.ts | 287 | Pure crypto: cert parsing, signature verify, validity/key-usage policy, chain validation, OCSP entry. |
| e_signature.encryption.service.ts | 83 | AES-256-GCM envelope encryption for sensitive setting values. |
| e_signature.etsi_tsl.service.ts | 210 | Fetch + parse + XAdES-verify ETSI EU LOTL / per-country TSL XML. |
| e_signature.identity.service.ts | 53 | Normalize raw claims to OIDC4IDA verified-claims shape. |
| e_signature.ocsp.service.ts | 200 | OCSP request build, POST, response parse + responder-signature verify. |
| e_signature.settings.service.ts | 139 | System + tenant setting read/write with masking + envelope encryption. |
| e_signature.trust_list.service.ts | 204 | Trust-root read path (Redis cache), ETSI/TR ingestion, persistence. |

## Findings

### 🔴 Critical
- **[Dimension 5 — DB access / data integrity] Tenant secret written into ROOT tenant under wrong key via mis-ordered `SettingService.create` args** — `SettingService.create(tenantId, key, value, group?, type?)` is called with four positional args `(ROOT_TENANT_ID, tenantId, key, encryptOpt(incoming))`. This maps `tenantId=ROOT_TENANT_ID`, `key=<the tenant's id>`, `value=<the setting-key name>`, `group=<the encrypted secret>`. The encrypted tenant secret is written to the **root tenant**, keyed by the tenant's UUID, with the secret landing in the `group` column — so it (a) leaks/co-mingles tenant config into `ROOT_TENANT_ID`, and (b) can never be read back by `getTenantInternal`, which queries `SettingService.getValue(tenantId, key)`. Tenant-scoped aggregator credentials are therefore silently broken and stored in the wrong tenant scope. Evidence: `e_signature.settings.service.ts:124`. Rule: `database-patterns.md`, `multi-tenancy-patterns.md`. Fix: call `SettingService.create(tenantId, key, ESignatureEncryptionService.encryptOpt(incoming))`.

### 🟠 High
- **[Dimension 3 — Error handling] Services throw raw `Error` instead of `AppError`** — every throw in the module uses `new Error(...)`, so route handlers cannot derive an HTTP status or `ErrorCode`. Representative evidence: `e_signature.service.ts:128`, `:131`, `:231`, `:236`, `:329`; `e_signature.cert.service.ts:48`; `e_signature.crypto.service.ts:55`, `:103`, `:104`, `:113`, `:181`, `:199`, `:223`, `:231`; `e_signature.encryption.service.ts:25`, `:27`, `:53`, `:59`; `e_signature.trust_list.service.ts:97`, `:156`; `e_signature.ocsp.service.ts:101`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(message, statusCode, ErrorCode.X)` from `@/modules/common/app-error`; map cert/transaction failures to 400/401/422, infra/config (`ENCRYPTION_KEY_MISSING`, `TRUST_ROOT_MISSING`) to 500/503.
- **[Dimension 2 — Boundary validation] DB / Redis output not passed through a Safe* schema before leaving the service** — `findByFingerprint`/`findByUser` return raw `SigningCertificate` entities; `toBound` hand-maps to `BoundCertificate` without `BoundCertificateSchema.parse`; `loadTransaction` does `JSON.parse(raw) as TransactionRecord` with a bare cast though `TransactionRecordSchema` exists; `getTrustRootsForCountry` caches/returns un-parsed `JSON.parse(cached) as string[]`. Evidence: `e_signature.cert.service.ts:11-24`, `:98-117`; `e_signature.service.ts:202-203`; `e_signature.trust_list.service.ts:35`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: parse Redis/DB output through the existing `*Schema` (e.g. `TransactionRecordSchema.safeParse`) before returning.
- **[Dimension 12 — Security hardening] SSRF: outbound HTTP to URLs derived from untrusted certificate/XML content with no allow-listing** — `checkRevocationOCSP` POSTs to the OCSP URL taken from the leaf cert's AIA extension, and `ingestEtsiLOTL` GETs every `TSLLocation` URL parsed out of the (possibly unverified) LOTL XML. Both reach arbitrary attacker-influenceable hosts (the OCSP responder URL comes from the presented certificate). Evidence: `e_signature.crypto.service.ts:251` / `e_signature.ocsp.service.ts:75`; `e_signature.trust_list.service.ts:116`, `e_signature.etsi_tsl.service.ts:49`,`:71`. Rule: `security-hardening.md`, `secure-api-and-input-validation.md`. Fix: restrict outbound revocation/TSL fetches to `https`, block private/link-local IP ranges, and gate ingestion on a verified signer (`LOTL_SIGNER_CERT_PEM`) rather than warning-and-continuing on unverified LOTL (`e_signature.trust_list.service.ts:108-110`).
- **[Dimension 12 — Security hardening] Cross-IP/UA transaction binding is bypassable** — `pollStatus` only enforces the IP/UA scope check when both the stored and incoming values are present (`record.ip && ip && record.ip !== ip`). A client that omits/forges a missing `ip`/`ua` skips the session-fixation guard entirely, and the check is advisory rather than fail-closed on absent values. Evidence: `e_signature.service.ts:327`. Rule: `security-hardening.md`. Fix: treat missing scope values as a mismatch (fail closed) for sensitive `bind`/`sign` purposes, or bind the transaction to an authenticated session id.

### 🟡 Medium
- **[Dimension 8 — Service composition] Facade reaches around its own encryption helper with a duplicated, inlined implementation** — `e_signature.settings.service.ts:136-139` defines a private `ESignatureService_isEncrypted` that hardcodes the `'v1.'` prefix instead of calling `ESignatureEncryptionService.isEncrypted`, duplicating logic and drifting if the wire-format version changes. Evidence: `e_signature.settings.service.ts:38`, `:92`, `:136`. Rule: `service-composition-pattern.md`. Fix: use `ESignatureEncryptionService.isEncrypted(...)`.
- **[Dimension 11 — Logging and audit] No audit trail on security-relevant mutations** — certificate `bind`, `revoke`, `markUsed`, identity-verification success, and admin setting writes (`updateAdmin`/`updateTenantAdmin`) emit no audit-log entry. Webhooks are dispatched but that is integration delivery, not an internal audit trail. Evidence: `e_signature.cert.service.ts:26-89`; `e_signature.settings.service.ts:62-77`,`:115-133`; `e_signature.service.ts:465-479` (webhook dispatch, not audit). Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget audit-log entries for bind/revoke and admin setting changes (no secret values in the line).
- **[Dimension 4 — Messages pattern] Hardcoded user-facing/error strings instead of the messages source** — several throws use inline literals rather than `E_SIGNATURE_MESSAGES`. Evidence: `e_signature.encryption.service.ts:53` (`'encrypted value has unexpected format'`), `:59` (`'encrypted value has wrong auth tag length'`); `e_signature.ocsp.service.ts:101` (`'cannot decode certificate DER'`), `:134` (`'cannot decode OCSP response'`); `e_signature.service.ts:364` returns bare `'signature_invalid'`/`'certificate_*'` reason strings. Rule: `module-messages-pattern.md`. Fix: move these into `e_signature.messages.ts` (the reason-code strings are arguably an enum, but the thrown prose should come from the messages file).
- **[Dimension 1 — Static service class] `ESignatureService_isEncrypted` is a free function defined in a service file** — the module otherwise follows the static-class convention, but the settings service appends a top-level helper function outside the class. Evidence: `e_signature.settings.service.ts:136`. Rule: `code-structure-ts-master.md`. Fix: inline as a private static method or delegate to the encryption service (see Dimension 8 finding).

### 🔵 Low
- **[Dimension 7 — Authorization] Resource-level ownership not checked in service** — `findByUser`, `revoke`, `markUsed`, and the tenant settings read/write trust the `userId`/`tenantId` argument with no in-service ownership/role assertion; authz is enforced at the route layer. Evidence: `e_signature.cert.service.ts:18-24`, `:84-89`; `e_signature.settings.service.ts:89-133`. Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md).
- **[Dimension 5 — DB access] Trust-root read path returns rows without an explicit null/empty guard distinction** — `getTrustRootsForCountry` returns `[]` for both "no roots" and "all expired", which callers treat as "skip chain validation" (`e_signature.service.ts:395-397`) — a silent soft-fail rather than a tracked state. Evidence: `e_signature.trust_list.service.ts:41-47`. Rule: `database-patterns.md`. Fix: distinguish "country unconfigured" from "configured-but-empty" so chain validation is not silently skipped in production.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | All classes are static-only single default exports; one free helper function in settings service (`:136`). |
| 2 | Boundary validation | ❌ | DB/Redis output returned via bare `as` casts; existing Safe* schemas (`TransactionRecordSchema`, `BoundCertificateSchema`) not applied. |
| 3 | Error handling | ❌ | Every throw is raw `Error`; no `AppError`/`ErrorCode` anywhere — routes cannot derive HTTP status. |
| 4 | Messages pattern | ⚠️ | Mostly uses `E_SIGNATURE_MESSAGES`; a few inline literals in encryption/ocsp/poll-reason strings. |
| 5 | DB access & entity ownership | ❌ | `SettingService.create` arg mis-order corrupts tenant secret write (Critical); else DB confined to services, entities under `entities/`, null-checked. |
| 6 | Multi-tenancy | ⚠️ | `signing_certificates`/`trust_list_entries` are system-wide (correctly `getDataSource()`); settings correctly scope to `ROOT_TENANT_ID`/`tenantId` except the buggy `create` call writing tenant data into ROOT. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource-level checks; authz enforced at route layer (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ⚠️ | Facade pattern + lazy import to break OCSP cycle is good; settings service duplicates `isEncrypted` instead of delegating. |
| 9 | Caching | ✅ | Trust-list and transaction Redis reads fail open (`.catch(() => null)`); TTL set; no obvious hot path left uncached. |
| 10 | Secrets & config | ✅ | All config via `@/modules/env`; no `process.env` in any service; secrets envelope-encrypted at rest. |
| 11 | Logging & audit | ❌ | No audit-log entries for bind/revoke/markUsed or admin setting writes; security events only `Logger.warn`. |
| 12 | Security hardening | ❌ | SSRF on OCSP/TSL outbound URLs from untrusted input; IP/UA scope guard bypassable; LOTL ingested unverified when signer cert absent. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dotted `*.service.ts`, PascalCase classes, entities under `entities/`. |

## Recommendations
1. **Fix the `SettingService.create` arg order** in `updateTenantAdmin` (`:124`) immediately — it writes encrypted tenant secrets into the root tenant under the wrong key and breaks tenant credential reads.
2. **Replace all `throw new Error(...)` with `AppError`** from `@/modules/common/app-error`, mapping each `E_SIGNATURE_MESSAGES` case to an explicit status + `ErrorCode`.
3. **Add SSRF defenses** to OCSP (`checkRevocationOCSP`) and TSL/LOTL fetches: enforce `https`, deny private/link-local hosts, and refuse to ingest an unverified LOTL in production.
4. **Validate output through the existing Zod schemas** (`TransactionRecordSchema`, `BoundCertificateSchema`) instead of `as` casts on Redis/DB reads.
5. **Make the IP/UA transaction guard fail closed** for `bind`/`sign`, or bind the transaction to a session id.
6. **Audit-log** bind/revoke and admin setting mutations (fire-and-forget, no secret values).
7. **Delegate `isEncrypted`** to `ESignatureEncryptionService` and remove the duplicated free function.

## References
- Rules: error-handling-and-app-error.md, validation-philosophy.md, zod-validation.md, database-patterns.md, multi-tenancy-patterns.md, security-hardening.md, secure-api-and-input-validation.md, service-composition-pattern.md, logging-monitoring-and-audit-trails.md, module-messages-pattern.md, code-structure-ts-master.md, authorization-and-rbac.md, env-and-config.md, naming-conventions.md, file-organization.md · Source: modules/e_signature/e_signature.service.ts, e_signature.cert.service.ts, e_signature.crypto.service.ts, e_signature.encryption.service.ts, e_signature.etsi_tsl.service.ts, e_signature.identity.service.ts, e_signature.ocsp.service.ts, e_signature.settings.service.ts, e_signature.trust_list.service.ts
