> **Uygulandı** — 2026-06-10: Added optional actorId param to update() and reset(); fire-and-forget AuditLogService.log (SETTINGS_UPDATED) emitted when actorId is present; customCss/customJs capped at .max(50_000) in TenantBrandingSchema.

# tenant_branding — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `tenant_branding.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 2m / 0l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `tenant_branding.service.ts` | 36 | Thin facade over `SettingService` for per-tenant white-label branding keys (logo, colors, favicon, custom CSS/JS): `get`, `update`, `reset`. |

## Findings

### 🟡 Medium
- **[Dimension 11 — Logging and audit] No audit log on branding mutations** — `update()` and `reset()` change tenant-visible chrome (logos, custom CSS/JS) but emit no audit-trail entry. White-label changes — especially `customCss`/`customJs` injection and brand resets — are exactly the kind of meaningful admin action that should be audit-logged fire-and-forget. Evidence: `modules/tenant_branding/tenant_branding.service.ts:14`, `:31`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: after a successful `updateMany`/`delete`, fire `AuditLogService.log(...)` (catch-and-swallow) recording actor, tenantId, and changed keys.
- **[Dimension 12 — Security hardening] `customCss` / `customJs` stored as unconstrained strings** — `TenantBrandingSchema` accepts `customCss` and `customJs` as free-form `z.string().optional()` with no sanitization or length cap. Per `module.json` ("read by the proxy/shell to render per-tenant chrome") these are rendered into the per-tenant shell, so a tenant admin can persist arbitrary JS executed in the rendered shell — a stored-XSS / supply-chain surface. Evidence: `modules/tenant_branding/tenant_branding.types.ts:12-13`. Rule: `security-hardening.md`. Fix: cap length and sanitize/escape, or gate `customJs` behind an explicit allow-list/CSP and document the trust boundary; treat these fields as untrusted at the render layer.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `class TenantBrandingService` is all-static, single default export, never instantiated. |
| 2 | Boundary validation | ✅ | Route `safeParse`s input (`route.ts:55`); service re-parses DB output through `TenantBrandingSchema` (`service.ts:11`); no ad-hoc if/else validation. |
| 3 | Error handling | ✅ | Service throws nothing of its own; `reset` swallows per-key delete errors as a non-critical side-effect (`service.ts:33`). No raw `Error`. |
| 4 | Messages pattern | ✅ | Service body contains zero hardcoded user-facing strings (only imports); throws nothing, so no `messages.ts` is required. |
| 5 | DB access & entity ownership | ✅ | No direct DB access; all persistence delegated to `SettingService`. Module owns no entities (correct — it has none). |
| 6 | Multi-tenancy | ✅ | Every call passes `tenantId`; `SettingService` resolves `tenantDataSourceFor(tenantId)` for all reads/writes (`setting.service.ts:42,131,160`). No cross-tenant path. |
| 7 | Authorization / RBAC | ⚠️ | No in-service check; ADMIN/OWNER role enforced at route layer (`route.ts:21-25,48-52,82-86`). authz enforced at route layer; resource-level check not in service (deviation from `authorization-and-rbac.md`). |
| 8 | Service composition & boundaries | ✅ | Composes `SettingService` via the `@/` facade alias; no sub-service cross-imports or cycles. |
| 9 | Caching | — | N/A — read path is light and `SettingService` caches downstream; no hot uncached path here. |
| 10 | Secrets & config | ✅ | No `process.env` reads, no secrets handled in the service. |
| 11 | Logging & audit | ❌ | `update`/`reset` mutate tenant chrome with no audit log (Medium finding). |
| 12 | Security hardening | ⚠️ | `customCss`/`customJs` persisted as unconstrained strings — stored-XSS surface at render (Medium finding). |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files (`.service.ts`, `.types.ts`, `.setting.keys.ts`), PascalCase class. |

## Recommendations
1. Add fire-and-forget audit logging in `update()` and `reset()` (actor + tenantId + changed keys) to close the Dimension 11 gap.
2. Constrain and sanitize `customCss`/`customJs` (length cap + sanitization, or explicit CSP/allow-list trust boundary) to reduce the stored-XSS surface; document that the render layer must treat them as untrusted.
3. Leave route-layer authz as-is per repo convention; optionally document the trust boundary in the module README so the route-vs-service split is explicit.

## References
- Rules: `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `authorization-and-rbac.md`, `multi-tenancy-patterns.md`, `service-composition-pattern.md` · Source: `modules/tenant_branding/tenant_branding.service.ts`, `tenant_branding.types.ts`, `tenant_branding.setting.keys.ts`, `app/tenant/[tenantId]/api/settings/branding/route.ts`, `modules/setting/setting.service.ts`
