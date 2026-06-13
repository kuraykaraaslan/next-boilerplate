# Good to Have — Notification SMS

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Per-Tenant Configuration Gaps

### ✅ Per-Tenant SMS Provider Selection (Wire Up `smsProvider` Setting)
**Why:** The `smsProvider` setting key is declared, seeded, and shown in the tenant admin UI, but the backend never reads it; `DEFAULT_PROVIDER_NAME` is always the global `env.SMS_DEFAULT_PROVIDER`, so a tenant admin's provider choice has zero effect.
**Complexity:** Low
**Multi-tenant relevance:** Different tenants have existing contracts with different SMS providers (Twilio vs Nexmo vs NetGSM); honoring the per-tenant `smsProvider` setting is the minimum requirement for a configurable multi-tenant system.
**Multi-country relevance:** Provider coverage and per-message pricing vary dramatically by destination country; tenants operating in Turkey use NetGSM, those in Europe/US use Twilio or Nexmo — the per-tenant setting is the vehicle for this regional specialization.

### ✅ Per-Tenant SMS Enable/Disable Toggle (Wire Up `smsEnabled` Setting)
**Why:** The `smsEnabled` setting key is declared and shown in the UI but never read by any service method; a tenant admin who disables SMS in their settings still has SMS messages delivered.
**Complexity:** Low
**Multi-tenant relevance:** Tenants on plans that include SMS credits should be able to temporarily suspend SMS (e.g. during a cost review) without the platform operator needing to intervene.
**Multi-country relevance:** Tenants operating in markets where SMS is heavily regulated (e.g. India's TRAI DLT registration requirement) may need to disable SMS while completing regulatory onboarding.

### ✅ Per-Tenant Country Allowlist (`smsAllowedCountries`)
**Why:** `ALLOWED_COUNTRIES` is built once from `env.SMS_ALLOWED_COUNTRIES` and applied uniformly to all tenants; a tenant that should only send to Turkey cannot enforce that without platform operator involvement.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant may have different geographic licensing for SMS (e.g. a Turkish e-commerce tenant should only send to +90 numbers); per-tenant allowlists enforce this without operator configuration changes.
**Multi-country relevance:** Regulatory compliance for SMS (opt-in requirements, sender ID registration, content filters) is per-country; per-tenant allowlists are the enforcement gate for compliant delivery boundaries.

### Per-Tenant Region-to-Provider Routing Map
**Why:** `REGION_PROVIDER_MAP` is a single static map built from `env.SMS_PROVIDER_MAP` shared by all tenants; a tenant cannot route TR→NetGSM while another tenant routes TR→Twilio.
**Complexity:** Medium
**Multi-tenant relevance:** Different tenants may have negotiated different pricing tiers with different providers for the same destination country; a per-tenant routing map (stored as a JSON setting) overrides the platform default.
**Multi-country relevance:** Provider quality and pricing for a given country varies; per-tenant region routing gives each tenant the flexibility to optimize for their specific destination market mix.

### Per-Tenant Rate Limit Window and Tenant-Scoped Rate Limit Key
**Why:** `RATE_LIMIT_SECONDS` is a global env constant, and the Redis rate-limit key is `sms:rate-limit:{to}` (not scoped by `tenantId`); two tenants messaging the same phone number share one throttle window, causing cross-tenant interference.
**Complexity:** Low
**Multi-tenant relevance:** A high-volume tenant hitting rate limits should not prevent another tenant from sending an OTP to the same number; the rate-limit key must include `tenantId`.
**Multi-country relevance:** Regulatory and provider-imposed rate limits differ by country (some markets have stricter per-second throughput limits); a per-tenant, per-country configurable window lets tenants comply with local carrier rules.

---

## Localization / i18n

### Locale-Aware Message Templates
**Why:** SMS message bodies are assembled by callers as plain English strings; there is no mechanism in this module to select or render a message in the recipient's locale.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant serving multiple language communities needs locale-aware SMS (OTP in Turkish for TR numbers, in German for DE numbers); template selection based on recipient country code or user preference is the solution.
**Multi-country relevance:** OTP SMS in the wrong language reduces completion rates; marketing SMS in an unrecognized language may be treated as spam by carriers.

### Unicode / Non-Latin Character Set Handling
**Why:** SMS messages over 160 GSM-7 characters or containing non-ASCII characters (Arabic, Chinese, Turkish İ/Ş/Ğ) consume multiple message segments; no provider abstraction today accounts for multi-segment pricing or truncation.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants with non-English content may unknowingly send 2–4 segment messages, blowing through their monthly quota faster than expected.
**Multi-country relevance:** Turkish, Arabic, Hebrew, Chinese, and Japanese all require UCS-2 encoding; an SMS that reads as one segment in English becomes two or more in these languages — a significant per-message cost difference.

---

## Compliance & Regulatory

### Sender ID / Originator Registration per Country
**Why:** Many countries (Turkey via BTK, India via TRAI, the UK via the ICO) require SMS sender IDs to be pre-registered with a carrier or regulatory body; the current model sends from a single configured phone number without country-specific sender ID management.
**Complexity:** High
**Multi-tenant relevance:** Each tenant may operate under a different registered sender ID; the per-tenant `netgsmPhoneNumber` (msgheader) partially covers this for NetGSM but is not generalized across providers.
**Multi-country relevance:** Unregistered sender IDs are blocked or fined by regulators in 30+ countries; a sender ID registry (per tenant, per country, per provider) is the production-grade solution.

### ✅ Opt-Out / STOP Keyword Handling
**Why:** Recipients can reply STOP to most carrier networks but the platform has no mechanism to record, honor, or forward those opt-outs; continued sending to opted-out numbers violates CAN-SPAM, GDPR, TCPA, and most national regulations.
**Complexity:** High
**Multi-tenant relevance:** Opt-out state is per-tenant (a user opting out of tenant A's SMS should still receive tenant B's OTPs if they consent); per-tenant opt-out lists prevent cross-tenant leakage.
**Multi-country relevance:** Opt-out keyword standards differ by country (STOP in English, ARRET in French Canada, DEREGISTRARSE in Spanish markets); carrier-reported opt-outs arrive via provider webhooks and need country-aware parsing.

### DLT (Distributed Ledger Technology) Template Registration (India)
**Why:** India's TRAI mandates that all transactional and promotional SMS templates be pre-registered on the DLT platform; sending unregistered templates results in message blocking by carriers.
**Complexity:** High
**Multi-tenant relevance:** Tenants with Indian user bases must manage DLT-registered template IDs per message type; storing these per tenant per message type is a requirement, not a nice-to-have, for the Indian market.
**Multi-country relevance:** This is an India-specific regulation but represents a class of country-level SMS template compliance requirements that exist in other forms (Turkey's BTK content classification, Indonesia's BRTI rules).

### Content Filtering / PII Redaction in Logs
**Why:** OTP codes, account numbers, and personal identifiers flow through SMS message bodies that are logged in full by `Logger.info`/`Logger.error` (e.g. `Queued SMS to ${to}`); operator log aggregators may inadvertently store PII.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's users' data (phone numbers, OTPs) appearing in shared platform logs creates a data-isolation risk.
**Multi-country relevance:** GDPR, KVKK (Turkey), and PDPA (Thailand) classify phone numbers as personal data; logging them in plain text to aggregated log stores may constitute unlawful processing.

---

## Provider Ecosystem

### Additional Regional Providers
**Why:** The current provider set (Twilio, Nexmo, Clickatell, NetGSM) lacks coverage for major markets: no AWS SNS, no MessageBird, no Kaleyra (India), no China-compliant provider (CMPP, SP gateway), no WhatsApp Business API (high adoption in Brazil, India, MENA).
**Complexity:** Medium per provider
**Multi-tenant relevance:** Enterprise tenants in under-served markets may already have contracts with market-specific providers; the pluggable `BaseSMSProvider` contract makes adding them straightforward.
**Multi-country relevance:** China blocks international SMS providers entirely; Brazil, India, and Southeast Asia have very high WhatsApp penetration that makes WhatsApp Business API a de-facto SMS alternative; regional coverage gaps limit go-to-market.

### Provider Delivery Receipt / Status Webhook Handler
**Why:** All four providers support asynchronous delivery receipts (DLR) via webhooks, but the platform has no webhook routes for these; delivery status stays `pending` in the log forever once the SMS is accepted by the carrier.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admin dashboards show delivery statistics; `sent` means "accepted by provider" today, not "delivered to handset" — a meaningful distinction for enterprise tenants who track delivery SLAs.
**Multi-country relevance:** DLR availability and format differ by country and carrier; EU carriers reliably report delivery, while some African/Asian carriers may only report acceptance; provider-specific webhook parsing handles these differences.

### Provider Health Check and Circuit Breaker
**Why:** If a provider's API is down, every send attempt will fail and log an error until the process is restarted or credentials are reconfigured; there is no circuit breaker to automatically fall back to an alternate provider after N consecutive failures.
**Complexity:** Medium
**Multi-tenant relevance:** A provider outage affecting one tenant's primary SMS provider should trigger automatic failover without operator intervention or cross-tenant impact.
**Multi-country relevance:** Provider reliability varies by region; a circuit breaker that tracks failures per (tenantId, provider, regionCode) enables region-aware failover decisions.

---

## Observability & Operations

### SMS Delivery Analytics per Tenant
**Why:** There is no service method or route returning aggregated SMS delivery stats (sent/failed/pending counts, success rate, top destination countries) per tenant and time window.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admin dashboards need SMS delivery health at a glance; `notification_log` already stores all the data but has no aggregation endpoint.
**Multi-country relevance:** Delivery rates differ significantly by destination country; per-country breakdown helps tenants understand where their SMS spend is going and where failures cluster.

### Queue Depth Monitoring and Throttling
**Why:** `smsQueue` is a BullMQ queue with no concurrency limit set in the worker; under a large broadcast, the queue can grow unboundedly and a single slow provider response blocks other tenants' SMS.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant isolation requires that one tenant's SMS burst does not starve other tenants' OTP delivery; per-tenant concurrency slots or priority lanes address this.
**Multi-country relevance:** Provider rate limits are often per-second and per-region; queue concurrency must be tuned to stay within provider limits for each delivery country.
