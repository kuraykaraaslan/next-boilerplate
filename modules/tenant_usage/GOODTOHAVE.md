# Good to Have — Tenant Usage Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Metering Accuracy & Completeness

### ✅ `apiCalls` Counter Not Actually Wired
**Why:** The README states "`apiCalls` increment is wired at the route-middleware layer (Limiter hook)" but this is aspirational — reviewing the codebase shows no call to `TenantUsageService.incrementApiCall` in the Limiter middleware; API call counts are always 0 in the DB.
**Complexity:** Low
**Multi-tenant relevance:** API-call metering is required for enforcing `API_RATE_LIMIT` feature keys and for per-tenant usage dashboards; a counter that is never incremented silently defeats both features.
**Multi-country relevance:** No direct country relevance, but SaaS platforms selling to enterprise customers in regulated markets use API usage as a billing signal — inaccurate counters undermine billing integrity.

### Per-Endpoint API Call Breakdown (Not Just Total Count)
**Why:** `apiCalls` is a single integer per month — there is no breakdown by endpoint, HTTP method, or resource type; an operator cannot identify which API endpoint is consuming the most of a tenant's quota.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins and operators need endpoint-level granularity to debug unexpected usage spikes and to validate that billing correctly reflects actual consumption.
**Multi-country relevance:** No direct country relevance, but enterprise API consumers in EU markets expect an itemized usage report to validate their invoices — a single aggregate count is insufficient for dispute resolution.

### ✅ Webhook Call Counter
**Why:** The module tracks `apiCalls`, `aiTokens`, `storageBytes`, `emailSends`, and `smsSends`, but not webhook delivery attempts — tenants on plans with `FEATURE_WEBHOOKS` have no metered visibility into their webhook consumption.
**Complexity:** Low
**Multi-tenant relevance:** Plans that cap webhook endpoints or delivery attempts need a counter; without it the feature gate for webhooks cannot enforce a per-period delivery quota.
**Multi-country relevance:** No direct country relevance.

### Storage Bytes Counter Tracks Uploads but Not Deletions
**Why:** `incrementStorageBytes` is called on upload but there is no `decrementStorageBytes` call when files are deleted — `storageBytes` monotonically increases and diverges from actual storage consumption over time.
**Complexity:** Low
**Multi-tenant relevance:** A tenant that deletes 90% of their files still appears to be consuming the original storage quota; the feature gate `FEATURE_STORAGE_QUOTA_BYTES` then incorrectly blocks new uploads.
**Multi-country relevance:** No direct country relevance, but billing disputes over inaccurate storage meters are a common support issue in markets with strong consumer-protection laws (EU, Australia, Japan).

## Historical Data & Reporting

### ✅ Multi-Month Usage History Query
**Why:** `getUsage(tenantId, month)` fetches a single month; there is no `getUsageHistory(tenantId, fromMonth, toMonth)` — usage trend charts in the admin UI would require N sequential calls.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins want to see usage trends over the last 6 or 12 months to plan their next plan tier; single-month reads cannot power a trend chart.
**Multi-country relevance:** No direct country relevance.

### Daily-Granularity Usage Counters (Within a Month)
**Why:** Usage is aggregated at monthly (`YYYY-MM`) granularity — daily spikes within a month are invisible; a tenant that sends 10,000 emails on one day and 0 on every other day looks identical to one that sends ~320/day.
**Complexity:** Medium
**Multi-tenant relevance:** High-resolution metering is needed for overage pricing (charge per unit above the plan limit, billed daily) and for anomaly detection (unexpected spike on a specific day may indicate a bug).
**Multi-country relevance:** Some jurisdictions (EU OSS VAT) require usage records at day-level granularity for tax reporting — monthly aggregates are not sufficient for tax authority audit trails.

### Usage Watermark / Peak Usage Tracking
**Why:** Counters represent the cumulative sum for the month — a plan with `STORAGE_GB: 10` should track the high-water mark of storage used (not the sum of all uploads), because storage is a capacity limit not a flow limit.
**Complexity:** Medium
**Multi-tenant relevance:** `storageBytes` summing all uploads over time is semantically incorrect for storage-capacity enforcement — deletes reduce actual consumption but the counter never decreases.
**Multi-country relevance:** No direct country relevance, but metering accuracy is a billing integrity issue that affects all markets equally.

## Billing Integration

### Overage Billing Trigger When Quota Is Exceeded
**Why:** When `assertFeatureAccess` denies access due to a LIMIT being reached, there is no event or hook to charge the tenant for overage — the service blocks the action but does not initiate a metered charge.
**Complexity:** High
**Multi-tenant relevance:** Usage-based billing (pay-per-seat-above-plan, pay-per-GB-above-plan) is a common enterprise pricing model; without an overage hook the platform can only hard-block, which is a worse UX than charging a per-unit overage rate.
**Multi-country relevance:** Usage-based overage pricing requires accurate per-country currency conversion and VAT calculation — a feature-gate hard block avoids these complexities but limits the commercial model.

### Carry-Over or Rollover Quota Between Months
**Why:** Counters reset to 0 each month (new month, new Redis key, new DB row) — there is no mechanism to carry unused quota forward (e.g., "unused AI tokens this month roll over up to 2 months").
**Complexity:** Medium
**Multi-tenant relevance:** Plans with rollover are a competitive differentiator; tenants value knowing their unused quota is not wasted.
**Multi-country relevance:** No direct country relevance, but rollover quota mechanics must be correctly reflected in invoices — EU VAT rules require that each chargeable service is correctly described on the invoice.

## Compliance & Data Governance

### ✅ Usage Data Retention Policy and Purge Job
**Why:** `TenantUsage` rows accumulate indefinitely — there is no background job that purges usage records older than N months after a tenant is deleted or after the records have no billing relevance.
**Complexity:** Low
**Multi-tenant relevance:** After a tenant is hard-purged (`tenant_deletion`), its `TenantUsage` rows remain as orphaned personal data (they contain a `tenantId` which is personal data under GDPR if the tenant is an individual).
**Multi-country relevance:** GDPR Art. 5(1)(e) storage limitation requires personal data to be deleted once its purpose is fulfilled; LGPD Art. 10 has the same requirement — usage rows for deleted tenants must be purged.

### Usage Breakdown Included in Tenant Data Export
**Why:** `tenant_export` already exports `tenantUsage` rows, but only the current monthly aggregate — historical usage rows for past months are not exported, leaving the tenant without a complete picture of their consumption history.
**Complexity:** Low
**Multi-tenant relevance:** Tenants migrating to a competitor platform need their historical usage data to validate their billing history and ensure they were not overcharged.
**Multi-country relevance:** GDPR Art. 20 data portability covers all personal data — the `tenantId` linkage makes usage records personal data, so historical rows must be included in a complete portability export.

## Developer Experience & Observability

### Usage Alerting: Threshold Webhooks Before Quota Is Exhausted
**Why:** There is no mechanism to notify a tenant (via webhook or email) when their usage reaches 80% or 95% of a plan limit — tenants discover they have hit the wall only when `assertFeatureAccess` starts throwing errors.
**Complexity:** Medium
**Multi-tenant relevance:** Proactive usage alerts prevent service disruptions and give tenants time to upgrade before hitting the hard block; this reduces support tickets and involuntary churn.
**Multi-country relevance:** No direct country relevance, but enterprise tenants in regulated industries (banking, healthcare) cannot tolerate unexpected service disruptions — advance warning is a contractual SLA requirement in many enterprise deals.

### Platform-Wide Usage Aggregation for Operator Dashboard
**Why:** `getUsage` is per-tenant only — there is no `getAggregatedUsage(fromMonth, toMonth)` that rolls up `aiTokens`, `storageBytes`, and `emailSends` across all tenants for operator-level capacity planning and cost allocation.
**Complexity:** Low
**Multi-tenant relevance:** Platform operators need to know total AI token consumption across all tenants to negotiate LLM provider pricing tiers and to forecast infrastructure costs.
**Multi-country relevance:** Operators running multi-region deployments need aggregated usage per region to allocate costs and optimize pricing for each market.
