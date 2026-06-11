# Good to Have — Tenant Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Lifecycle & Compliance

### Configurable Deletion Grace Period per Plan Tier
**Why:** The 30-day `DELETION_GRACE_DAYS` constant is hardcoded; enterprise customers expect a longer recovery window while free-tier tenants may need faster cleanup for regulatory hygiene.
**Complexity:** Low
**Multi-tenant relevance:** Different plans warrant different policies — cloning the operator-configured ROOT plan should also carry a grace-period override stored on the subscription or as a per-tenant setting.
**Multi-country relevance:** GDPR Art. 17 ("right to erasure") timelines differ from LGPD (Brazil) or PIPL (China) — some jurisdictions require data to be purged within a specific number of days, not 30 days globally.

### Hard-Purge Cascade: Cross-Module Data Destruction
**Why:** `purgeExpiredTenants` calls `softRemove` on the `Tenant` row, but does not explicitly cascade-delete storage files on S3, revoke API keys, cancel active subscriptions with the payment provider, or remove Redis keys — leaving orphaned data in multiple systems.
**Complexity:** High
**Multi-tenant relevance:** In a multi-tenant DB each tenant has isolated data; the cascade must fan out to tenant_domain, tenant_member, uploaded_file (S3 objects), webhook delivery queues, and the payment provider's customer record.
**Multi-country relevance:** GDPR Art. 17 requires that data purge is complete and verifiable; a partial purge that leaves S3 blobs creates compliance exposure.

### Tenant Archival State (Read-Only Access Post-Cancellation)
**Why:** The `ARCHIVED` status is defined in `TenantStatusEnum` but is never set or used anywhere in the codebase; operators have no way to transition a tenant to read-only access before hard delete.
**Complexity:** Medium
**Multi-tenant relevance:** B2B SaaS customers often need 90-day read-only access to their data after subscription cancellation before the account is fully purged.
**Multi-country relevance:** Some jurisdictions require a minimum data-retention window (e.g., accounting records in Germany must be kept 10 years) — archival mode lets you satisfy retention without keeping a fully active tenant.

## Multi-Country / Localization

### Region Column Not Validated Against an Allowed Region List
**Why:** `CreateTenantDTO` accepts a `region` string (default `'TR'`) but there is no enum, no validation, and the column does not exist on the `Tenant` entity — the field is parsed but silently discarded.
**Complexity:** Low
**Multi-tenant relevance:** Region tagging is required to route tenants to the correct data residency zone (EU, US, APAC) and to enforce geo-fencing policies.
**Multi-country relevance:** GDPR and data-sovereignty laws require knowing where a tenant's data lives; without a validated `region` field on the entity you cannot enforce data residency at the DB-selection layer.

### Data Residency: Per-Region DataSource Routing
**Why:** `tenantDataSourceFor(tenantId)` currently resolves to a single shared datasource; there is no routing logic to direct a tenant to an EU-region Postgres instance vs a US-region one.
**Complexity:** High
**Multi-tenant relevance:** Each tenant's data needs to land in the region the tenant declared at signup; a single datasource means EU and US tenants share the same DB.
**Multi-country relevance:** GDPR requires EU personal data not to leave the EEA without adequate safeguards; PIPL (China) and PDPA (Thailand) impose similar local-processing requirements.

### Default Locale Seed Driven by Tenant Region
**Why:** `seedDefaults` always writes `language: 'en'`, `timezone: 'UTC'`, `dateFormat: 'YYYY-MM-DD'`; a tenant in Turkey or Brazil should get locale-appropriate defaults at creation time.
**Complexity:** Low
**Multi-tenant relevance:** Tenants in non-English markets will have to manually correct four settings immediately after signup, degrading onboarding UX.
**Multi-country relevance:** The correct locale default depends on the country of operation — a TR tenant expects `tr`, `Europe/Istanbul`, `DD.MM.YYYY`; a BR tenant expects `pt-BR`, `America/Sao_Paulo`, `DD/MM/YYYY`.

## Isolation & Security

### Tenant Slug / Unique Handle for Path-Based Tenancy
**Why:** The `Tenant` entity has no unique human-readable slug; path-based tenancy (e.g., `/t/acme-corp/dashboard`) requires a slug that is URL-safe, globally unique, and immutable after creation.
**Complexity:** Medium
**Multi-tenant relevance:** Without a slug, path-based tenancy must fall back to the UUID in URLs, which is unacceptable UX and breaks white-label portals.
**Multi-country relevance:** Slug uniqueness must handle Unicode normalization for non-Latin market names (Arabic, CJK, Cyrillic) — slugification rules differ by language.

### Tenant Isolation Verification / Cross-Tenant Data Leak Audit
**Why:** There is no automated test or runtime assertion that confirms `tenantDataSourceFor` queries cannot accidentally return rows from another tenant — a misconfigured `where` clause is an invisible cross-tenant data leak.
**Complexity:** Medium
**Multi-tenant relevance:** The most critical multi-tenancy invariant; a single missing `where: { tenantId }` filter exposes all tenants' data.
**Multi-country relevance:** Cross-tenant leaks that include EU personal data trigger mandatory GDPR breach notification (72-hour window) across all affected countries.

## Onboarding & Developer Experience

### Tenant Creation Webhook with Provisioning Outcome
**Why:** The `tenant.created` webhook fires immediately after the row is saved, before `seedDefaults` completes — so the payload never indicates whether the default plan or settings seeding succeeded or failed.
**Complexity:** Low
**Multi-tenant relevance:** Integration partners (billing systems, CRM, provisioning pipelines) need to know when a tenant is fully ready, not just when the row was inserted.
**Multi-country relevance:** No direct country relevance, but reliable provisioning signals are required for compliant onboarding flows (e.g., GDPR consent capture must happen after the tenant account exists).

### Tenant Metadata / Custom Attributes
**Why:** The `Tenant` entity carries only `name`, `description`, and `tenantStatus` — operators cannot store arbitrary key/value metadata (e.g., Salesforce account ID, VAT number, country of registration) without modifying the schema.
**Complexity:** Low
**Multi-tenant relevance:** B2B SaaS platforms typically need to attach operator-side metadata to tenants for CRM sync, support tooling, and compliance tagging.
**Multi-country relevance:** VAT registration numbers, fiscal codes, and legal entity types differ by country and must be stored on the tenant for invoicing compliance (e.g., EU VAT Directive).

## Performance

### `getAll` Missing Soft-Delete-Aware Count Index
**Why:** `getAll` runs a `COUNT` with `WHERE deletedAt IS NULL` across the `tenants` table with no partial index — on a platform with tens of thousands of tenants this becomes a sequential scan.
**Complexity:** Low
**Multi-tenant relevance:** Platform admins listing all tenants need sub-100ms pagination; without the index it degrades as the tenant registry grows.
**Multi-country relevance:** No direct country relevance, but global platforms have tenant registries in the hundreds of thousands.
