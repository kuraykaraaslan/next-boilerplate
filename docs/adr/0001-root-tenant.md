# ADR 0001 — Root tenant is a real tenant row

**Status:** Accepted (2026-05)

## Context

Earlier versions of this boilerplate had two parallel application surfaces:

- `app/system/...` — the super-admin / platform-admin surface, no `tenantId`, served global tables (`Setting`, `Coupon`, `SubscriptionPlan`, `SystemWebhook`, `SystemSamlConfig`, etc.).
- `app/tenant/[tenantId]/...` — the per-tenant surface, tenant-keyed everywhere.

Many entities existed in both shapes (`SystemWebhook` vs `Webhook`, `SystemSamlConfig` vs `SamlConfig`, system `AuditLog` vs `TenantAuditLog`) and the AdminShell carried a `variant: 'system' | 'tenant'` switch. The split duplicated code paths and made it impossible to share UI / route handlers between super-admin and tenant-admin views.

## Decision

The "system" surface is removed. A single tenant row with the deterministic UUID

```
ROOT_TENANT_ID = '00000000-0000-4000-8000-000000000000'
ROOT_TENANT_NAME = 'Platform'
```

owns the platform-admin / super-admin scope. A super-admin is a `TenantMember` of the root tenant with `memberRole = 'ADMIN'`. Every page and API lives under `app/tenant/[tenantId]/...`.

The `proxy.ts` middleware maps `localhost` (dev) and `{TENANT_DEFAULT_SUBDOMAIN}.{TENANT_WILDCARD_DOMAIN}` (prod) to `ROOT_TENANT_ID`; other hosts resolve via `TenantDomain` lookup; path-mode falls back to `ROOT_TENANT_ID` outside the tenant prefix.

`SystemWebhook` ↔ `Webhook`, `SystemSamlConfig` ↔ `SamlConfig`, and the two `AuditLog` entities were merged into single tenant-keyed entities. `Setting` and `TenantSetting` were collapsed into one `Setting` table with composite primary key `(tenantId, key)`. `SubscriptionPlan`, `PlanFeature`, and `Coupon` gained `tenantId` columns so every tenant has its own catalog.

## Consequences

**Positive**
- One code path. UI components (`AdminShell`, settings page, webhooks page) take `tenantId` and branch on `isRootTenant(tenantId)` only where the *behavior* differs (e.g. the platform-only nav group).
- New "global" platform features (Tenant CRUD, Plan CRUD, Fleet) live at `app/tenant/[tenantId]/admin/(sysadmin-scope)/*` and are gated by `isRootTenant()` guards in the page itself plus `authenticateAdminRequest()` (which authenticates against root-tenant membership) at the API layer.
- Tenant-owned provider config (Stripe, OpenAI, SMTP, S3 creds) drops out naturally: the root tenant happens to own the platform defaults; every other tenant owns its own credentials.

**Negative**
- The literal UUID `00000000-0000-4000-8000-000000000000` is a magic value in the codebase. Mitigated by a single exported constant (`@/modules/tenant/tenant.constants`).
- Cross-tenant operations (a platform admin acting on another tenant) still happen, but now they are explicit cross-tenant calls — `authenticateAdminRequest` returns the root tenant context, and the route reads/writes against `params.targetTenantId`. There is no implicit "system scope" anymore.

## Alternatives considered

- **Keep two surfaces, reduce duplication via shared components.** Rejected: even with shared components, the entity duplication (system_webhooks vs webhooks, etc.) and dual DataSource story leaked everywhere. The cost of keeping the split outweighed the cost of merging.
- **NULL `tenantId` for global rows.** Rejected: `NULL` semantics in composite keys + `WHERE tenantId = ?` queries are error-prone; defaulting to `NULL` made it easy to accidentally cross-leak data. A real row beats a sentinel.
