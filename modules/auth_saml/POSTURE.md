# auth_saml — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** auth_saml.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 3l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| auth_saml.service.ts | 373 | SAML SP config CRUD (cached), AuthnRequest URL + metadata generation, assertion validation, identity linking, role mapping, and JIT user/member provisioning. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — All 12 thrown errors in the service are `throw new Error(SamlMessages.X)`, so a route handler cannot derive an HTTP status (config-not-found, not-enabled, IdP-initiated-disabled, invalid-response, email-missing/mismatch, not-member should map to 404/403/400). `AppError` + `ErrorCode` exist at `modules/common/app-error.ts` and are unused here. Evidence: `modules/auth_saml/auth_saml.service.ts:143-144`, `:161-163`, `:168`, `:180`, `:245`, `:247`, `:317`, `:324`, `:350`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(SamlMessages.NOT_CONFIGURED, 404, ErrorCode.NOT_FOUND)`, `new AppError(SamlMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN)`, validation cases as 400.

### 🟡 Medium
- **[Dimension 5 — DB access] JIT provisioning multi-write not transactional** — `resolveOrProvisionUser` creates a user (`UserService.create`), auto-accepts invitations, then creates a tenant member (`TenantMemberService.create`) as separate writes across services. A failure after user creation but before member creation leaves an orphaned user with no membership and no compensation. Evidence: `modules/auth_saml/auth_saml.service.ts:327`, `:331`, `:353-358`. Rule: `database-patterns.md`. Fix: cross-service composition makes a single DB transaction hard; at minimum make the sequence idempotent/re-entrant and add compensating logic for the user-created-but-member-failed window.
- **[Dimension 2 — Boundary validation] Untyped assertion attribute access via `any`** — Callback parsing reads `(profile as any).email`, `(profile as any).nameID`, and indexes `attrs[emailAttr]` with `as string` casts rather than validating the SAML profile shape through a schema before use. The returned `SamlProfile` is hand-built, not produced by a `Safe*Schema` parse. Evidence: `modules/auth_saml/auth_saml.service.ts:170-191` (casts at `:176`, `:177`, `:191`). Rule: `validation-philosophy.md`. Fix: define a `SamlAssertionSchema` (or narrow with `safeParse`) and normalize before extracting email/name/attributes.

### 🔵 Low
- **[Dimension 2 — Boundary validation] Cached config cast without re-validation** — `loadConfig` casts the JSON-deserialized cache value `as SamlConfig` without re-validating; `createdAt`/`updatedAt` become strings post-`JSON.parse`. Downstream `getConfig` re-parses through `SafeSamlConfigSchema`, but `loadConfig`'s other callers (`generateAuthUrl`, `validateCallback`, `generateMetadata`, `resolveOrProvisionUser`) consume the raw cast directly. Evidence: `modules/auth_saml/auth_saml.service.ts:42-43`. Rule: `validation-philosophy.md`. Fix: parse the cached payload through a tolerant schema, or cache only the already-validated shape.
- **[Dimension 8 — Service composition] Cross-module imports use relative paths, not the `@/` alias** — Sibling-module service/type imports use `../user/...`, `../tenant_member/...`, etc. instead of the `@/modules/...` alias used for `db`/`redis`/`env`. They do go through each module's facade entrypoint with no sub-service cross-imports or cycles, so it is style-only. Evidence: `modules/auth_saml/auth_saml.service.ts:16-22`. Rule: `import-rules.md`. Fix: switch sibling-module imports to the `@/modules/...` alias for consistency.
- **[Dimension 12 — Security hardening] No in-service rate limiting on public SAML endpoints** — `generateMetadata` serves minimal metadata for any `tenantId` when no config exists (public-by-design), and `generateAuthUrl`/`validateCallback` are reachable unauthenticated; none assert rate limiting. Evidence: `modules/auth_saml/auth_saml.service.ts:194-206`. Rule: `security-hardening.md`. Fix: confirm route-layer rate limiting covers `/saml/metadata`, `/saml/login`, and `/saml/callback`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Input DTO typed; `getConfig`/`upsertConfig` output via `SafeSamlConfigSchema`, but assertion parsing uses `as any` casts (`:176-191`) and cached config is cast unvalidated (`:42-43`). |
| 3 | Error handling | ❌ | 12 raw `throw new Error(...)` instead of `AppError` with statusCode/ErrorCode. |
| 4 | Messages pattern | ✅ | All user-facing strings in `auth_saml.messages.ts`; inline XML template + URL builders are not user-facing prose. |
| 5 | DB access and entity ownership | ⚠️ | DB only in service, entity in `entities/`, null-checked; cross-service JIT multi-write not transactional (`:327-358`). |
| 6 | Multi-tenancy | ✅ | Uses `tenantDataSourceFor(tenantId)`; every `SamlConfig` query filtered by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource authz on config CRUD (`:81-139`); enforced at route layer (deviation from authorization-and-rbac.md). Queries are tenant-filtered — no cross-tenant leak. |
| 8 | Service composition and boundaries | ⚠️ | Cross-module calls via module facades (no sub-service cross-imports/cycles), but sibling imports use relative paths not the `@/` alias (`:16-22`). |
| 9 | Caching | ✅ | `singleFlight` + `jitter` TTL + negative cache + fail-open `.catch(() => {})` on Redis ops. |
| 10 | Secrets and config | ✅ | `APPLICATION_HOST` / `TENANT_CACHE_TTL` read via `@/modules/env`; no `process.env` in service. |
| 11 | Logging and audit | ✅ | JIT provision + role-map audit-logged; metadata carries email/nameId only, no cert/secret leakage. |
| 12 | Security hardening | ⚠️ | `wantAssertionsSigned`/clock-skew set; no in-service rate limiting on public metadata/auth/callback paths (`:194-206`). |
| 13 | Naming and file organization | ✅ | snake_case module, kebab-style file suffixes, PascalCase `SamlService`, correct `.service/.dto/.types/.enums/.messages` split. |

## Recommendations
1. Replace all 12 raw `throw new Error(SamlMessages.X)` with `AppError(message, statusCode, ErrorCode.X)` so route handlers return correct HTTP statuses (High).
2. Make the JIT user+invitation+member provisioning sequence idempotent/re-entrant (and add compensation) to avoid orphaned users from a partial failure (Medium).
3. Validate the parsed SAML assertion through a Zod schema before extracting email/name/attributes; remove `as any` casts (Medium).
4. Re-validate cached config and switch sibling-module imports to the `@/modules/...` alias (Low).
5. Confirm route-layer rate limiting and RBAC cover the SAML config CRUD, metadata, login, and callback endpoints (Low).

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `database-patterns.md`, `authorization-and-rbac.md`, `import-rules.md`, `security-hardening.md`, `caching-patterns.md`, `multi-tenancy-patterns.md` · Source: `modules/auth_saml/auth_saml.service.ts`
