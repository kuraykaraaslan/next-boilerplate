# tenant_domain — Posture Review

> **Uygulandı:** 2026-06-10 — Critical IDOR (tenantId scope on getById/update/delete/verify), High AppError, High create+update transactions, Medium SUBDOMAIN_LIMIT_EXCEEDED message + JSON.parse try/catch, test mock güncellemeleri tamamlandı.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** dns_verification.service.ts, ssl_provisioning.service.ts, tenant_domain.service.ts
> **Overall grade:** D · **Findings:** 1c / 3h / 7m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| tenant_domain.service.ts | 272 | CRUD + verification orchestration for tenant custom domains; cache read-through; domain/subdomain limit enforcement. |
| dns_verification.service.ts | 211 | TXT/CNAME token generation, Redis token storage, DNS lookups, active-domain DNS recheck cron. |
| ssl_provisioning.service.ts | 227 | Caddy `on_demand_tls.ask` authorization + TLS handshake probing + SSL status reconciliation cron. |

## Findings

### 🔴 Critical
- **[Dimension 6 — Multi-tenancy] By-id reads/mutations are not scoped to a tenant (cross-tenant IDOR).** `getById`, `getVerificationInfo`, `initiateVerification`, `verifyDomain`, `update`, and `delete` all fetch the row with `getDataSource()` + `findOne({ where: { tenantDomainId } })` — no `tenantId` in the predicate — and the route never passes one. The route only verifies the caller is ADMIN/OWNER of the URL `tenantId`, then calls `TenantDomainService.delete(domainId)` / `getVerificationInfo(domainId)` with the bare id (`app/tenant/[tenantId]/api/domains/[domainId]/route.ts:24,57`). An admin of tenant A can supply tenant B's `domainId` and read its verification record or delete its domain. Evidence: `modules/tenant_domain/tenant_domain.service.ts:59-60`, `:159`, `:180`, `:206`, `:238`, `:262`. Rule: `multi-tenancy-patterns.md`. Fix: thread `tenantId` into these methods and include it in every `where` (`{ tenantDomainId, tenantId }`), using `tenantDataSourceFor(tenantId)`; have the route pass its authenticated `tenantId`.

### 🟠 High
- **[Dimension 3 — Error handling] Services throw raw `Error` instead of `AppError`.** Every failure path throws `new Error(TenantDomainMessages.X)` or an inline string, so a route handler cannot derive an HTTP status (callers blanket-return 400). Evidence: `modules/tenant_domain/tenant_domain.service.ts:61,123,137,141,160,181,207,210,239,243,246,263,265`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(message, 404|409|403|422, ErrorCode.X)`.
- **[Dimension 6 — Multi-tenancy] Tenant entity read from the system DataSource in single-row lookup paths.** `getByDomain` and `getById` query the tenant-scoped `TenantDomain` via `getDataSource()` (`tenant_domain.service.ts:80-81`, `:59-60`). `getByDomain` (domain→tenant resolution) is defensible as a system-wide router lookup, but `getById` returning a single tenant's row off the system DS with no tenant predicate is the read half of the Critical IDOR; `update`, `getVerificationInfo`, `initiateVerification`, `verifyDomain`, and `delete` likewise do their initial lookup on the system DS. Rule: `multi-tenancy-patterns.md`. Fix: keep only the genuine global resolver on the system DS; scope all single-row reads by `tenantId` via `tenantDataSourceFor`.
- **[Dimension 5 — DB access] Multi-write operations are not transactional.** `create` does a uniqueness check, two counts, a "demote existing primary" `update`, then `save` as separate statements (`tenant_domain.service.ts:122-150`); `update`/`verifyDomain` likewise do read-modify-write across statements (`:165-170`, `:248-253`). A concurrent create can exceed the domain limit or leave two primaries. Rule: `database-patterns.md`. Fix: wrap the check-then-write sequences in a `dataSource.transaction(...)` / `QueryRunner`.

### 🟡 Medium
- **[Dimension 4 — Messages] Hardcoded inline user-facing string in service.** The subdomain-limit error is built inline rather than sourced from `tenant_domain.messages.ts`. Evidence: `modules/tenant_domain/tenant_domain.service.ts:137` (`` `Subdomain limit exceeded. Maximum allowed: ${maxSubdomains}` ``). Rule: `module-messages-pattern.md`. Fix: add a `SUBDOMAIN_LIMIT_EXCEEDED` message (or a template) to the messages file and reference it.
- **[Dimension 2 — Boundary validation] Redis verification blob is parsed untyped.** `getStoredData` does `JSON.parse(data)` and returns it as `{ token, method }` with no Zod `safeParse` (`dns_verification.service.ts:61`); the value flows into `getVerificationInfo`/`checkVerification` unvalidated. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: `safeParse` the stored verification blob against a small schema and treat a parse failure as "no stored data". (Note: the DNS/SSL cron methods operate on raw entity rows but return only tallies, not rows, so no `Safe*Schema` boundary is crossed there.)
- **[Dimension 5 — DB access] Untyped `as any` cast on the update payload.** `repo.update({ tenantDomainId }, data as any)` defeats column typing and could persist unexpected keys. Evidence: `tenant_domain.service.ts:169`. Fix: type the payload to the entity's updatable columns.
- **[Dimension 3 — Error handling] Untyped `JSON.parse` in `getStoredData` can throw into callers.** A malformed Redis value would throw uncaught from `getStoredData` rather than failing closed (returning "no stored data"). Evidence: `dns_verification.service.ts:61`. Fix: wrap the parse in try/catch and treat malformed tokens as `null`.
- **[Dimension 12 — Security hardening] SSL recheck cron probes stored hosts without re-applying the IP/internal-name guard.** `isProvisioningAllowed` blocks IP literals and `localhost` before any DB lookup (`ssl_provisioning.service.ts:65-94`), but `recheckCertificates` calls `probeCertificate(row.domain)` directly on every stored domain without re-applying that guard, so a row whose `domain` is an internal name/IP would be probed (outbound TLS to a user-influenced host). Evidence: `ssl_provisioning.service.ts:101-144,185`. Note: `probeCertificate` is reached only by the cron, not by any verify/initiate route; among the HTTP routes only `[domainId]` GET is un-rate-limited (`route.ts:11-36`) while collection GET/POST, the `[domainId]` DELETE, and `verify` POST are rate-limited. Fix: re-validate `row.domain` (no IP literals / internal names) before probing in the cron.
- **[Dimension 11 — Logging/audit] CRUD mutations are not audit-logged.** `create`, `update`, `verifyDomain`, and `delete` perform meaningful state changes but emit no `AuditLogService.log`; only the system DNS-failure path audits (`dns_verification.service.ts:173`). Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit entry on each admin-driven mutation.
- **[Dimension 9 — Caching] Read-through cache has no negative cache / single-flight / jitter.** `getByDomain` is a hot router path (every request resolving a custom domain) and caches only positive hits with a fixed TTL; a miss for an unknown host hits Postgres every time and a thundering herd is unprotected. Evidence: `tenant_domain.service.ts:68-93`. Rule: `caching-patterns.md`. Fix: add a short negative-cache marker and TTL jitter (and consider single-flight) on the domain resolver.

### 🔵 Low
- **[Dimension 8 — Composition] Sibling service composed directly with no module facade.** `TenantDomainService` imports `DNSVerificationService` directly (`tenant_domain.service.ts:11`); acceptable as same-module siblings, but there is no `index.ts` facade re-exporting the module's services. Rule: `service-composition-pattern.md`. Fix: optionally expose a `tenant_domain` index/facade.
- **[Dimension 5 — DB access] Non-null assertions after `findOne`.** `SafeTenantDomainSchema.parse(updated!)` assumes the row still exists post-update (`tenant_domain.service.ts:172,255`). Low risk but should null-check and throw `DOMAIN_NOT_FOUND`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All three are static-only classes with a single default export. |
| 2 | Boundary validation | ⚠️ | Inputs typed via DTOs; output uses `SafeTenantDomainSchema` in main service, but the Redis verification blob is parsed untyped in `getStoredData`. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` throughout; route cannot derive status. Untyped Redis `JSON.parse` can throw into callers. |
| 4 | Messages pattern | ⚠️ | Messages file used, but one inline subdomain-limit string at `:137`. |
| 5 | DB access & ownership | ⚠️ | Entities in `entities/`, DB only in services; but multi-write ops not transactional, `as any` cast, `findOne` non-null asserts. |
| 6 | Multi-tenancy | ❌ | By-id reads/mutations unscoped on system DataSource → cross-tenant IDOR (Critical). |
| 7 | Authorization / RBAC | ⚠️ | Authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). The route's tenant-ownership gate is undermined because `tenantId` never reaches the service — see Dimension 6. |
| 8 | Composition & boundaries | ✅ | Cross-module imports via `@/` alias; sibling DNS service composed directly; no cycles; no module facade (Low). |
| 9 | Caching | ⚠️ | Read-through present but no negative cache / single-flight / jitter on hot `getByDomain`. |
| 10 | Secrets & config | ✅ | `VERIFICATION_DOMAIN`, `TENANT_CACHE_TTL`, `TENANT_WILDCARD_DOMAIN` all read via Zod-validated `@/modules/env`; no `process.env` in services. |
| 11 | Logging & audit | ⚠️ | System DNS-failure path audits; admin CRUD mutations are not audit-logged. No secret leakage in logs. |
| 12 | Security hardening | ⚠️ | Good IP/localhost guard + `rejectUnauthorized` in caddy-ask; but `recheckCertificates` probes stored hosts without re-applying that guard. |
| 13 | Naming & organization | ✅ | snake_case module, kebab-ish service suffixes, PascalCase classes, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. **(Critical) Close the cross-tenant IDOR:** add `tenantId` to every by-id method signature and `where` clause, route through `tenantDataSourceFor(tenantId)`, and pass the authenticated `tenantId` from the route. Keep only the genuine global domain→tenant resolver on the system DS.
2. **(High) Replace all `throw new Error(...)` with `AppError(message, statusCode, ErrorCode.X)`** so routes return correct HTTP statuses (404/409/403/422) instead of blanket 400.
3. **(High) Wrap check-then-write sequences** (`create`, `update`, `verifyDomain`, primary-demotion) in a transaction to prevent limit-bypass and double-primary races.
4. **(Medium) Move the inline subdomain-limit string into `tenant_domain.messages.ts`.**
5. **(Medium) Harden boundaries and side-effects:** `safeParse` the Redis verification blob (try/catch around `JSON.parse`, fail closed); remove the `as any` cast; null-check after `findOne`.
6. **(Medium) Re-apply the IP/internal-name guard in `recheckCertificates`** before probing; add audit logging to `create/update/verifyDomain/delete`.
7. **(Medium) Harden the `getByDomain` resolver cache** with a negative-cache marker and jittered TTL.

## References
- Rules: `multi-tenancy-patterns.md`, `error-handling-and-app-error.md`, `module-messages-pattern.md`, `validation-philosophy.md`, `database-patterns.md`, `authorization-and-rbac.md`, `caching-patterns.md`, `security-hardening.md`, `logging-monitoring-and-audit-trails.md`, `env-and-config.md` · Source: `modules/tenant_domain/{tenant_domain,dns_verification,ssl_provisioning}.service.ts`
