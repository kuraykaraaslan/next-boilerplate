# Good to Have — Setting

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Value Safety and Validation

### Per-Key Schema Validation on Write
**Why:** `create` and `updateMany` store any string value for any key with no schema validation; a tenant admin who writes `"yes"` for a `boolean` setting or `"abc"` for a `number` setting will get no error at write time but will cause a runtime parse failure when the consuming module reads the value.
**Complexity:** Medium
**Multi-tenant relevance:** Schema violations in one tenant's settings should not affect other tenants; validation at write time prevents a misconfigured tenant from silently breaking its own service and producing confusing errors far from the write site.
**Multi-country relevance:** Localization settings (`defaultTimezone`, `dateFormat`, `currencySymbol`) must conform to strict formats (IANA timezone IDs, ISO 8601 format strings, ISO 4217 currency codes); accepting arbitrary strings leads to runtime failures when rendering date/currency values for country-specific locales.

### Sensitive Value Encryption at Rest
**Why:** The `Setting.value` column stores all values as plaintext `text`; keys like `s3SecretKey`, `mailApiKey`, `paymentSecretKey` are currently stored unencrypted in the database, meaning a database dump exposes all tenant secrets.
**Complexity:** Medium
**Multi-tenant relevance:** A database breach exposes all tenants' secrets simultaneously; per-key or per-group encryption (similar to `ESignatureEncryptionService` AES-256-GCM envelope encryption already in the codebase) would limit blast radius to the keys of compromised tenants only.
**Multi-country relevance:** GDPR (EU), KVKK (Turkey), and PDPA (Thailand) all impose pseudonymisation/encryption requirements on personal and sensitive data stored by data processors; storing payment or mail credentials in plaintext violates these obligations.

### Setting Value Masking in Admin API Responses
**Why:** The `GET /api/admin-settings` route returns all setting values as plaintext, including secrets like `s3SecretKey` and `mailApiKey`; the e-signature module solves this with `***SET***` masking but the core setting module has no equivalent.
**Complexity:** Low
**Multi-tenant relevance:** Any tenant admin with API access can exfiltrate all other-module credentials via the settings route; masking sensitive values in API responses protects against credential exposure even from authorized but malicious admins.
**Multi-country relevance:** GDPR and related laws require access minimisation — API responses should not contain more data than necessary; a masked response satisfies the principle of minimal disclosure required by multiple privacy regimes.

---

## Hierarchical and Inherited Settings

### Platform-Level Default → Tenant Override Inheritance
**Why:** The module treats `ROOT_TENANT_ID` as "just another tenant" with no formal inheritance model; a new tenant receives no default values unless the seed explicitly inserts them, and there is no way to update a platform default and have all tenants that have not overridden it automatically pick up the new value.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators need to push a new `mailProvider` default to all tenants that have not set their own without running a bulk DB migration; inheritance (read root → apply tenant override) enables this workflow.
**Multi-country relevance:** Country-specific platform defaults (e.g., `defaultTimezone=Europe/Istanbul` for all Turkish tenants, `defaultLanguage=de` for German tenants) can be seeded at a regional root level rather than per-tenant, reducing setup effort when onboarding tenants in a new country.

### Setting Groups as Typed Namespaces with Metadata
**Why:** `group` is a plain `varchar` with no associated metadata (display name, description, icon, order, visibility); the admin UI must hardcode group names and cannot render dynamic group descriptions or icons from the data layer.
**Complexity:** Low
**Multi-tenant relevance:** A tenant admin UI that auto-generates from setting group metadata is easier to maintain as new modules add groups; new modules plug in without requiring UI changes.
**Multi-country relevance:** Group display names need to be translatable (the UI might show "Stockage" instead of "Storage" for a French-locale tenant admin); storing the group key as a lookup allows the UI to apply i18n independently of the stored key.

### Read-Only (Locked) Settings
**Why:** There is no mechanism to mark a setting key as read-only at the platform level (e.g., `storageProvider` forced to `cloudflare-r2` for a specific tenant by the platform operator); tenant admins can overwrite any setting via `updateMany`.
**Complexity:** Low
**Multi-tenant relevance:** Platform operators sometimes need to enforce a specific setting value for a tenant (e.g., locking a tenant to a specific mail provider for compliance reasons) without the tenant being able to change it through the admin UI.
**Multi-country relevance:** Data residency compliance may require locking `s3Region` for EU tenants to `eu-central-1` and for Turkish tenants to a Turkish-region bucket; a locked setting enforces this at the data layer rather than relying on UI-only restrictions.

---

## Change Management

### Setting Change Audit Log
**Why:** Every `create`, `update`, `updateMany`, and `delete` call mutates tenant configuration silently; there is no audit trail of who changed which setting key to what value and when.
**Complexity:** Low
**Multi-tenant relevance:** When a tenant's email delivery stops working, the ability to look up "who set `mailProvider=sendgrid` at 14:32 yesterday" is essential for debugging; without an audit log this context is lost.
**Multi-country relevance:** GDPR Art. 5(2) (accountability principle), Turkish KVKK, and ISO 27001 all require demonstrable audit trails for configuration changes that affect personal data processing; the setting module is the central place to enforce this.

### Setting Change Webhooks / Event Emission
**Why:** When a setting value changes, consuming modules have no way to be notified in real time; they must either poll (expensive) or wait for the next Redis cache miss (up to 10 minutes stale). A critical setting change (e.g., new `storageProvider`) takes up to `REDIS_TTL = 600s` to propagate.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's modules should receive targeted invalidation for only that tenant's changed keys; a global invalidation event would be too noisy in a many-tenant platform.
**Multi-country relevance:** Tenants changing country-specific settings (e.g., updating their `defaultLanguage` or `currencySymbol` after expanding to a new country) expect the change to take effect immediately, not after a 10-minute cache window.

### Setting Import / Export (JSON Bundle)
**Why:** There is no way to export a tenant's complete settings as a JSON snapshot or import a settings bundle; migrating settings from a staging tenant to a production tenant requires manual comparison and copy-paste.
**Complexity:** Low
**Multi-tenant relevance:** Platform operators onboarding enterprise tenants need to apply a pre-validated settings template in one operation; they also need to export a tenant's settings for backup or disaster recovery.
**Multi-country relevance:** Country-specific settings templates (a "German tenant" bundle with correct timezone, language, currency, GDPR-compliant mail settings) can be shipped as a JSON file and applied to any new German tenant at provisioning time.

---

## Localization Settings

### IANA Timezone Validation
**Why:** `defaultTimezone` is a plain string; nothing prevents a tenant admin from writing `"Istanbul"` instead of `"Europe/Istanbul"`, which will silently produce incorrect date rendering or runtime errors in any code that passes the value to `Intl.DateTimeFormat` or `date-fns-tz`.
**Complexity:** Low
**Multi-tenant relevance:** Timezone misconfiguration causes incorrect timestamps in email notifications, invoice dates, and audit logs for every user in the affected tenant.
**Multi-country relevance:** Every country in which the platform operates has one or more IANA timezone identifiers; enforcing a valid IANA identifier at write time is prerequisite to reliable multi-timezone support.

### ISO 4217 Currency Code Validation and Per-Tenant Currency List
**Why:** `currencySymbol` stores a display symbol (e.g., `€`, `₺`) but not the ISO 4217 code (`EUR`, `TRY`); the store module's `currency` column defaults to `USD` with no reference to the tenant's configured `currencySymbol`, producing mismatched currency display.
**Complexity:** Low
**Multi-tenant relevance:** A Turkish tenant whose store shows prices in TRY (Türk Lirası) but whose setting stores `₺` as a freeform symbol cannot reliably format prices using `Intl.NumberFormat` (which requires ISO codes, not symbols).
**Multi-country relevance:** Supporting multi-currency e-commerce requires ISO 4217 codes at the data layer; the setting module is the right place to enforce valid codes and expose a per-tenant list of accepted currencies.

### Multi-Language UI Configuration (Tenant Admin Language)
**Why:** The `defaultLanguage` setting controls the end-user-facing language but there is no setting for the tenant admin UI language; a Turkish tenant admin who prefers to manage their workspace in English cannot separate the admin locale from the storefront locale.
**Complexity:** Low
**Multi-tenant relevance:** Admin users within a tenant may have different preferred languages from the tenant's customer-facing locale (e.g., a Turkish company whose admins work in English but whose customers see Turkish).
**Multi-country relevance:** Multi-country teams often have admins in different countries managing the same tenant; a per-user admin locale preference (stored in user settings, falling back to tenant setting) serves multi-country operations teams.

---

## Performance

### Bulk Cache Invalidation via Redis Pattern Match
**Why:** `clearCache(tenantId)` fetches all setting keys from the DB to build cache keys and deletes them one-by-one; in a tenant with hundreds of settings this is O(N) DB reads and O(N) Redis DEL calls, which is slow and produces high DB load during bulk invalidation.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's cache namespace is `settings:<tenantId>:*`; a single `redis.unlink` with a glob pattern (or a SCAN + pipeline DEL) would clear all of a tenant's cached settings in one round trip rather than N sequential deletes.
**Multi-country relevance:** High-scale multi-country tenants with many locale-specific settings accumulate more keys per tenant; the O(N) invalidation cost scales with the number of countries the tenant has configured.
