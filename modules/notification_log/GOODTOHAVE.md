# Good to Have — Notification Log

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Schema & Data Richness

### Retry Count and Attempt History
**Why:** The log records one row per delivery attempt but no `retryCount` or `attemptedAt[]` field, so there is no way to distinguish a first-attempt failure from a fifth-retry failure when debugging.
**Complexity:** Low
**Multi-tenant relevance:** High-volume tenants with elevated failure rates need per-tenant retry analytics to detect systematic provider issues without scanning raw logs.
**Multi-country relevance:** Providers serving certain regions have higher transient failure rates; retry data per recipient country helps identify region-specific reliability problems.

### Template / Event Type Metadata Column
**Why:** The log records `subject` for mail but no `eventType` (e.g. `welcome_email`, `otp`, `invoice_issued`); querying "how many OTPs were sent last month" requires scanning subjects with LIKE patterns.
**Complexity:** Low
**Multi-tenant relevance:** Per-tenant event analytics (which templates drive the most email volume per tenant) are only possible with a structured `eventType` column.
**Multi-country relevance:** Template usage varies by region (e.g. invoice templates localized per country); structured event types enable locale-specific delivery reports.

### Recipient Country / Region Column
**Why:** Phone numbers are stored as E.164 strings but the parsed region code is discarded after the SMS service uses it for routing; querying delivery rates by country requires re-parsing stored numbers.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with international users can see which countries generate the most notifications without joining back to user records.
**Multi-country relevance:** Country-level delivery analytics are a prerequisite for compliance reporting (GDPR data-transfer records) and for capacity planning per provider-region.

### Delivery Latency Field
**Why:** `sentAt` is a `@CreateDateColumn` set at row-insert time, not at the time the provider acknowledged delivery; there is no field to track actual provider response time or queue-to-deliver latency.
**Complexity:** Low
**Multi-tenant relevance:** SLA reporting per tenant requires provable delivery timestamps; high-priority tenants may contractually require sub-second delivery.
**Multi-country relevance:** Regional network latency between the platform and providers (SES in us-east-1 vs EU-west) is only visible with a provider-response timestamp.

---

## Querying & Filtering

### ✅ Date-Range Filter in `list()`
**Why:** The `NotificationLogQuery` interface has no `from`/`to` date filters; listing 30-day delivery history requires fetching all rows and filtering in memory at the route layer.
**Complexity:** Low
**Multi-tenant relevance:** Admin dashboards for busy tenants may have millions of log rows; without date filtering, the 200-row cap hides recent failures.
**Multi-country relevance:** Compliance audits in some jurisdictions (GDPR, KVKK) require producing delivery records within a specific date window on demand.

### ✅ Full-Text / Recipient Search
**Why:** There is no `ILIKE` or full-text search on `recipient`; finding "all notifications sent to +905551234567" requires an exact match; partial-email or phone prefix search is not supported.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant support agents need to look up a user's notification history by partial email or phone; exact-match-only filtering forces unnecessary full scans.
**Multi-country relevance:** Phone formats differ (local vs E.164); a normalized search index handles multi-format queries from different country operators.

### Cursor-Based Pagination
**Why:** The current `offset`/`limit` model degrades at high offsets on large tables; a keyset cursor on `(sentAt, notificationLogId)` provides stable, efficient pagination.
**Complexity:** Medium
**Multi-tenant relevance:** High-volume tenants accumulate millions of rows; offset pagination at page 10,000 causes full table scans even with indexes.
**Multi-country relevance:** Multi-country platforms accumulate log volume faster; cursor pagination is essential for reasonable admin UI performance at scale.

---

## Retention & Archival

### ✅ Automatic Log Retention / Pruning Policy
**Why:** Rows accumulate indefinitely with no TTL or archival job; a tenant with 3 years of notifications will have an unbounded table that degrades query performance.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant retention policies let premium tenants keep 2-year history while free-tier tenants retain 30 days, matching subscription plan value.
**Multi-country relevance:** GDPR right-to-erasure requires deleting personal data (recipient email/phone) on request; a scheduled pruning job with per-tenant policy is the operational foundation for erasure compliance.

### ✅ PII Anonymization on Expired Records
**Why:** `recipient` stores email addresses and phone numbers in plain text; there is no mechanism to anonymize or redact these once a tenant's retention window expires.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants operating in regulated markets must be able to demonstrate PII is not retained beyond policy; row-level anonymization preserves audit counts while erasing identity.
**Multi-country relevance:** GDPR (EU), LGPD (Brazil), KVKK (Turkey), and PDPA (Thailand) all impose different retention windows; per-tenant anonymization schedules mapped to country of operation are the practical implementation.

---

## GDPR / Compliance

### Per-User Erasure ("Right to be Forgotten") Support
**Why:** No service method exists to delete or anonymize all log rows for a specific user across all channels; implementing GDPR erasure currently requires direct database access.
**Complexity:** Medium
**Multi-tenant relevance:** Erasure must be scoped per tenant — a user's data in tenant A must not affect their data in tenant B; the existing `tenantId`-scoped data model supports this but no service method exposes it.
**Multi-country relevance:** Every EU/EEA country's GDPR implementation, Brazil's LGPD, and Turkey's KVKK all mandate timely erasure on request; a standard `eraseByRecipient(tenantId, recipient)` method is the minimal compliance primitive.

### Immutability / Tamper-Evidence
**Why:** `NotificationLog` rows can be updated or deleted by any service with DataSource access; a compliance log should be append-only with a cryptographic or hash-chain tamper check.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants in regulated industries (fintech, health) may require certified audit logs; immutability is a trust signal for these customers.
**Multi-country relevance:** Certain national regulations (e.g. German GoBD, French RGPD audit obligations) require that audit records cannot be retroactively altered; a tamper-evident append-only log satisfies these requirements.

---

## Observability & Admin UI

### Aggregated Delivery Statistics Endpoint
**Why:** There is no service method or route that returns `{ sent, failed, pending }` counts per channel per time window; building a dashboard widget requires a raw `findAndCount` with `GroupBy` from the route layer.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admin dashboards should show delivery health at a glance; pre-aggregated stats per tenant reduce DB pressure compared to ad-hoc queries.
**Multi-country relevance:** Operators monitoring a multi-country rollout need to compare delivery success rates by country/region without running manual queries.

### Webhook / Alert on Sustained Failure Rate
**Why:** If a tenant's mail provider starts bouncing 80% of messages there is no automated alert; the only signal is the growing count of `failed` rows, which require manual inspection.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant failure thresholds let the platform alert individual tenants when their specific provider degrades, without false positives from other tenants.
**Multi-country relevance:** Provider outages are often regional; country-specific failure spikes should trigger alerts for tenants using that provider in that region.
