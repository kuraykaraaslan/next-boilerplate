# Good to Have — User Preferences Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Localization

### Extended Language / Locale Support
**Why:** The `LanguageEnum` only contains `EN`, `ES`, `FR`, `DE`, `CN`, `JP` — six languages — while a multi-country SaaS platform must support at minimum the languages of its operating markets (Arabic, Portuguese, Turkish, Korean, Russian, etc.).
**Complexity:** Low
**Multi-tenant relevance:** Individual tenants targeting specific markets need the platform to accept and persist their market's locale; a hardcoded six-item enum forces a code change for every new market.
**Multi-country relevance:** Direct impact — the language field is the primary per-user localization signal used by every UI rendering path; an incomplete enum silently forces non-supported markets to fall back to English.

### Full IANA Timezone Validation
**Why:** `timezone` is stored as a free-form `varchar` with no server-side validation that the value is a valid IANA timezone identifier (e.g., `Europe/Istanbul`); invalid values silently pass through and cause runtime errors in date formatting.
**Complexity:** Low
**Multi-tenant relevance:** Tenants may pre-populate timezones for their users during onboarding; a bad value from an import would go undetected.
**Multi-country relevance:** Timezone accuracy is critical for multi-country deployments — cron jobs, scheduled notifications, and reporting all depend on correct per-user timezone handling.

### Currency Preference
**Why:** There is no currency field; users in different countries expect monetary values displayed in their local currency and format (e.g., `€1.234,56` vs. `$1,234.56`).
**Complexity:** Low
**Multi-tenant relevance:** Tenants in e-commerce or financial SaaS must display prices in the user's preferred currency; without this field the frontend must guess from locale.
**Multi-country relevance:** ISO 4217 currency codes vary by country; a `currency` preference enables correct formatting without additional geo-lookup on every page render.

### Number Format Preference
**Why:** Decimal separator and thousands separator conventions differ globally (`,` vs. `.`); there is no number-format preference beyond `dateFormat` and `timeFormat`.
**Complexity:** Low
**Multi-tenant relevance:** Finance and analytics tenants need consistent number display matching user expectation.
**Multi-country relevance:** The EU uses `.` as thousands separator and `,` as decimal; India uses lakh grouping (`1,00,000`); without an explicit preference the UI either hard-codes a format or guesses from language.

### Measurement System (Metric / Imperial)
**Why:** Unit-system preference (metric vs. imperial) is needed in any product that shows distances, weights, or temperatures; it is not derivable from locale alone (e.g., English-speaking Canada uses metric).
**Complexity:** Low
**Multi-tenant relevance:** Tenants in health, fitness, logistics, or real estate verticals need this; the field enables tenant UIs to render correct units without per-feature hardcoding.
**Multi-country relevance:** The US, Myanmar, and Liberia use imperial; every other country uses metric. A wrong unit display is both a usability and safety concern.

---

## Multi-tenancy

### Per-Tenant Preference Defaults
**Why:** Defaults (language `EN`, timezone `UTC`, theme `SYSTEM`) are hardcoded globally; tenants targeting a specific country or language should be able to configure defaults that new users in their tenant inherit on first sign-up.
**Complexity:** Medium
**Multi-tenant relevance:** Core multi-tenancy requirement — a Japanese tenant should default its users to `JP` / `Asia/Tokyo`, not `EN` / `UTC`.
**Multi-country relevance:** Correct default timezone and language reduce onboarding friction for users in non-English-speaking, non-UTC markets.

### Per-Tenant Notification Channel Restrictions
**Why:** Tenants may want to disable certain notification channels (e.g., a tenant without SMS infrastructure should hide `smsNotifications`); currently a user can toggle SMS notifications regardless of tenant capability.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant operators need control over which channels they have configured and billed for; exposing a channel the tenant hasn't set up creates dead user-facing toggles.
**Multi-country relevance:** SMS costs and carrier relationships vary by country; tenants may enable SMS only in markets where they have a configured provider.

---

## Privacy / GDPR

### Marketing Consent Granularity
**Why:** The single `newsletter` boolean conflates all marketing communications; GDPR Recital 32 requires granular, specific consent — transactional emails, product updates, and marketing must be separate toggleable fields with separate consent records.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants run different types of communications; a B2B tenant needs `productUpdates` + `invoiceEmails` while a B2C tenant needs `promotionalOffers`.
**Multi-country relevance:** GDPR (EU), CASL (Canada), CAN-SPAM (US), and LGPD (Brazil) all have different rules on what constitutes consent and what requires an explicit opt-in vs. opt-out.

### Consent Timestamp Storage
**Why:** There are no `newsletterConsentAt`, `emailNotificationsConsentAt` timestamps; if a user claims they never opted in to marketing emails, there is no stored evidence to the contrary.
**Complexity:** Low
**Multi-tenant relevance:** Tenants are responsible for their own GDPR compliance; the platform must give each tenant the raw consent evidence they need for regulatory audits.
**Multi-country relevance:** GDPR and LGPD require provable consent with a timestamp; CASL requires the source of consent (imported vs. user-initiated) to be recorded.

---

## Developer Experience

### Preferences Change History / Audit Log
**Why:** When a user disputes a notification setting or a tenant admin changes defaults, there is no history of what the value was before the last `update` call.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins who bulk-update user preferences need an audit trail to roll back mistakes or demonstrate compliance.
**Multi-country relevance:** Data-protection authorities in multiple jurisdictions may require logs showing when consent preferences were changed and by whom.

### Preference Schema Versioning
**Why:** Adding new preference fields (e.g., `currency`) invalidates cached rows silently; there is no schema version field to detect and migrate stale cached values.
**Complexity:** Low
**Multi-tenant relevance:** No tenant-specific impact, but affects all tenants when the schema evolves.
**Multi-country relevance:** Schema evolution is unavoidable as new markets require new preference fields; a version field makes migrations safe and auditable.
