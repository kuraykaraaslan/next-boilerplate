# Good to Have — Tenant Module

> All selected items shipped.

## Lifecycle & Compliance

### Configurable Deletion Grace Period per Plan Tier
`requestDeletion(tenantId, graceDays?)` now accepts an optional `graceDays` override (falls back to the 30-day constant). Plan-tier-driven grace periods can be passed by the calling layer.

### ✅ Hard-Purge Cascade: Cross-Module Data Destruction
`cascadePurge(tenantId)` in `tenant.deletion.service.ts` orchestrates:
1. Subscription cancellation via `TenantSubscriptionService`
2. API key revocation via `ApiKeyService.revokeAll`
3. Storage object deletion via `StorageService.deleteFile` per file row
4. Redis tenant-key flush via `clearTenantCache`
5. DataSource cache eviction via `clearTenantDsCache`

### ✅ Tenant Archival State (Read-Only Access Post-Cancellation)
`TenantStatusEnum` includes `ARCHIVED`. `TenantService.update` can transition to `ARCHIVED`; the consuming layer is responsible for enforcing read-only access in middleware.

---

## Multi-Country / Localization

### ✅ Region Column Not Validated Against an Allowed Region List
`ALLOWED_REGIONS` constant in `tenant.entity.ts` (`TR | EU | US | APAC | LATAM | MEA`). `CreateTenantDTO` and `UpdateTenantDTO` enforce this via `z.enum`. Invalid regions are rejected at parse time.

### Data Residency: Per-Region DataSource Routing
**Why:** `tenantDataSourceFor` resolves to a single shared datasource.
**Complexity:** High — not yet implemented.

### ✅ Default Locale Seed Driven by Tenant Region
`REGION_LOCALE_DEFAULTS` map in `tenant.service.ts` seeds `language`, `timezone`, `dateFormat`, `timeFormat` based on the tenant's `region` at creation time (e.g. TR → `tr`, `Europe/Istanbul`, `DD.MM.YYYY`).

---

## Isolation & Security

### ✅ Tenant Slug / Unique Handle for Path-Based Tenancy
`Tenant.slug` column (varchar 63, nullable, unique partial index where NOT NULL). `CreateTenantDTO` validates slug format (`/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`). `TenantService.getBySlug(slug)` resolves by handle. Conflict is checked on create and update.

### ✅ Tenant Isolation Verification / Cross-Tenant Data Leak Audit
`TenantService.verifyIsolation(tenantId, tableName)` queries `COUNT(*) WHERE tenantId != expected` on any table. Returns `{ ok, leakedRows }`. Call from scheduled audit cron or integration tests.

### ✅ Tenant Metadata / Custom Attributes
`Tenant.metadata` JSONB column (nullable, default `{}`). Exposed in `TenantSchema`, `CreateTenantDTO`, and `UpdateTenantDTO`. Operators can store VAT numbers, CRM IDs, fiscal codes, etc.

---

## Onboarding & Developer Experience

### ✅ Tenant Creation Webhook with Provisioning Outcome
`TenantService.create` now awaits `seedDefaults` completion before firing `tenant.created`. The event payload includes `provisioned: boolean` and `provisioningErrors: string[]`.

### ✅ Tenant Onboarding Checklist ★ New Feature
`TenantOnboardingService.getChecklist(tenantId)` returns a structured checklist:
- `dns_configured` — verified custom domain exists
- `mail_configured` — mail provider or SMTP set
- `payment_configured` — Stripe / PayPal / Iyzico key present
- `branding_configured` — site name or logo set
- `first_member_invited` — more than 1 active member
- `storage_configured` — non-local storage provider set

---

## Tenant Suspension ★ New Feature

### ✅ Tenant Suspension Flow
`TenantService.update` with `tenantStatus: 'SUSPENDED'` triggers both `tenant.updated` and `tenant.suspended` webhook events. The `SUSPENDED` status gates access at the middleware layer.

## Performance

### `getAll` Missing Soft-Delete-Aware Count Index
**Why:** COUNT with `WHERE deletedAt IS NULL` does a seq scan at scale.
**Complexity:** Low — add partial index via a migration.
