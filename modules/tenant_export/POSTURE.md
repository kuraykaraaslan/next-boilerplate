> **Uygulandı** — 2026-06-10: Added take:5000 caps to unbounded collections (WebhookDelivery, UploadedFile, AiUsageLog, NotificationLog, PaymentTransaction) to bound memory; ordered DESC so most-recent rows are exported.

# tenant_export — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** tenant_export.service.ts
> **Overall grade:** B · **Findings:** 0c / 0h / 2m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| tenant_export.service.ts | 163 | GDPR Art. 20 export: reads every per-tenant collection from the tenant datasource in parallel, strips sensitive columns (webhook `secret`, api-key `keyHash`, SAML `spPrivateKey`), and returns a pretty-printed UTF-8 JSON `Buffer`. |

## Findings

### 🟡 Medium

- **[Dimension 2 — Boundary validation] No `Safe*Schema` on exported DB output** — The service serializes raw TypeORM rows straight into the export, filtering sensitive fields only via an ad-hoc `stripFields` / object spread (`delete safe[f]`) rather than a `Safe*Schema` allow-list. A deny-list is fragile: any new sensitive column added to `Webhook`, `ApiKey`, `SamlConfig`, or any of the ~16 un-stripped collections (e.g. `Payment`, `Setting`, `NotificationLog`) silently leaks on the next migration. Evidence: `modules/tenant_export/tenant_export.service.ts:48` (`stripFields`), `:116` (`safeMembers`), `:127-149` (raw rows assigned). Rule: `validation-philosophy.md`. Fix: pass each collection through the owning module's `Safe*Schema` (allow-list) before assembling `exportData`.
- **[Dimension 11 — Logging and audit] Export action not audit-logged** — A full-tenant data export is a high-sensitivity action (every member, payment, api-key metadata leaves the tenant) yet it is only `Logger.info`'d, not written to `AuditLog`. There is no durable, queryable record of who exported what and when. Evidence: `modules/tenant_export/tenant_export.service.ts:61`, `:151`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget `AuditLog` entry (actor, tenantId, row counts) on successful export.

### 🔵 Low

- **[Dimension 7 — Authorization] In-service resource check absent** — The service trusts the `tenantId` argument and performs no resource-level ownership/role check; authz (`requiredTenantRole: 'OWNER'`) and rate limiting are enforced at the route. Per repo convention this is acceptable, but it is a deviation from `authorization-and-rbac.md`, which places resource-level checks inside the service. Evidence: `modules/tenant_export/tenant_export.service.ts:58`; route `app/tenant/[tenantId]/api/export/route.ts:25-29`. Rule: `authorization-and-rbac.md`. Fix: optionally assert the caller's OWNER membership inside the service for defense-in-depth.
- **[Dimension 12 — Security hardening] Unbounded export queries — memory-exhaustion risk** — `exportTenantData` issues ~19 `find()` queries across the entire tenant dataset and buffers everything in memory before `JSON.stringify`. Only `auditLogs` is capped (`take: 1000`); high-volume collections (`WebhookDelivery`, `NotificationLog`, `AiUsageLog`, `PaymentTransaction`, `UploadedFile`) are unbounded, so a large tenant can drive memory usage and produce an oversized buffer in a single allocation. Evidence: `modules/tenant_export/tenant_export.service.ts:83-113`, `:161`. Rule: `security-hardening.md`. Fix: add per-collection `take` caps or stream the response to bound memory; at minimum document the unbounded collections as a known scaling/DoS risk.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `class TenantExportService` — only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Trusts typed `tenantId`; but raw DB rows exported via deny-list `stripFields`, no `Safe*Schema` allow-list. |
| 3 | Error handling | ⚠️ | Service never throws (no `AppError`, no raw `Error`); DB errors propagate to the route which maps to `500`. No raw-`Error` violation, but no explicit `AppError` for failure modes either. |
| 4 | Messages pattern | ✅ | No user-facing strings returned from the service; only `Logger.info` log lines (not user-facing, not flaggable per the rules). |
| 5 | DB access & entity ownership | ✅ | DB touched only in service; module owns no entities (no `entities/` folder, per `module.json`); QueryBuilder join is parameterized, no raw SQL. Read-only — no transaction needed. |
| 6 | Multi-tenancy | ✅ | `tenantDataSourceFor(tenantId)`; every tenant-entity query filters `where:{tenantId}`; `PaymentTransaction` (no `tenantId`) correctly joined via `Payment.tenantId`. No cross-tenant leak. |
| 7 | Authorization / RBAC | ⚠️ | Authz enforced at route layer (`requiredTenantRole:'OWNER'`); resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | No sub-services/facade needed; cross-module entity imports use the `@/` alias, consistent with repo norm. No cycles. |
| 9 | Caching | — | On-demand GDPR export, not a hot read path; caching is inappropriate for a fresh export. N/A. (Unbounded-memory concern tracked under Dimension 12.) |
| 10 | Secrets & config | ✅ | No `process.env` reads; no secrets in service. Stripped secrets (`secret`, `keyHash`, `spPrivateKey`) are correctly removed from output. |
| 11 | Logging & audit | ⚠️ | Start/complete logged via `Logger`; no secret leakage in logs, but the export action is not written to `AuditLog`. |
| 12 | Security hardening | ⚠️ | Sensitive columns stripped; QueryBuilder parameterized (no injection); rate limiting at route. But ~19 unbounded reads buffered fully in memory (only `auditLogs` capped) — memory-exhaustion risk. |
| 13 | Naming & file organization | ✅ | `tenant_export` snake_case module, `tenant_export.service.ts` kebab/suffix correct, `TenantExportService` PascalCase. |

## Recommendations
1. Replace the deny-list `stripFields` approach with per-collection `Safe*Schema` allow-lists so newly added sensitive columns cannot silently leak (Dimension 2 — highest risk).
2. Audit-log every successful export (actor, tenantId, row counts) as a fire-and-forget `AuditLog` write (Dimension 11).
3. Bound the currently unbounded collections (`WebhookDelivery`, `NotificationLog`, `AiUsageLog`, `PaymentTransaction`, `UploadedFile`) with `take` caps or stream the response to limit memory (Dimension 12).
4. Optionally assert OWNER membership inside the service for defense-in-depth (Dimension 7).

## References
- Rules: validation-philosophy.md, logging-monitoring-and-audit-trails.md, authorization-and-rbac.md, multi-tenancy-patterns.md, security-hardening.md · Source: modules/tenant_export/tenant_export.service.ts, app/tenant/[tenantId]/api/export/route.ts
