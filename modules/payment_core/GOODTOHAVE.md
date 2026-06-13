# Good to Have — Payment Core

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Provider Abstraction & Extensibility

### Provider Capability Registry with Runtime Discovery
**Why:** Provider capabilities (direct charge, 3DS, wallets, refunds, BIN check, customer portal) are scattered across individual provider classes with no unified capability descriptor; callers must know which provider supports what at compile time.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admin UIs need to dynamically surface only the checkout options their chosen provider supports.
**Multi-country relevance:** Regional providers have wildly different feature sets; a capability registry lets the platform adapt to any combination without hardcoded conditionals.

### Async / Polling Status Pattern for Providers Without Webhooks
**Why:** `BasePaymentProvider.getPaymentStatus()` is synchronous and polling-based; there is no standard pattern for providers that deliver status exclusively via async callbacks (e.g. some BNPL or bank transfer providers).
**Complexity:** High
**Multi-tenant relevance:** Tenants adopting regional providers may need async status flows that the base class does not model.
**Multi-country relevance:** Bank transfer (SEPA, PIX, UPI) and BNPL payment methods in Europe, Brazil, and India are inherently async and require a polling/webhook hybrid.

### Provider Refund Support in BasePaymentProvider
**Why:** `BasePaymentProvider` has no `refundPayment` abstract method; `payment_sell` calls `provider.refundPayment()` directly but the base class does not declare it, making the interface incomplete and type-unsafe.
**Complexity:** Low
**Multi-tenant relevance:** Every tenant that processes refunds relies on this being a first-class provider capability.
**Multi-country relevance:** Refund rules (timing, partial refund support) differ by provider and country; standardizing the interface allows consistent handling.

## Regional Provider Coverage

### SEPA Direct Debit / EU Bank Transfer Provider
**Why:** There is no EU bank-transfer provider; SEPA credit transfers and direct debits are the dominant non-card payment method in Germany, Netherlands, Belgium, and Austria.
**Complexity:** High
**Multi-tenant relevance:** Tenants with EU customers lose a significant payment channel by not offering SEPA.
**Multi-country relevance:** SEPA covers 36 countries and is mandatory for many B2B and subscription billing scenarios in the EU.

### PIX (Brazil) Provider
**Why:** PIX is Brazil's central bank instant payment scheme and processed over 40 billion transactions in 2023; it is the dominant digital payment method in Brazil with no current coverage.
**Complexity:** High
**Multi-tenant relevance:** Any tenant targeting the Brazilian market needs PIX as a first-class option.
**Multi-country relevance:** PIX is Brazil-specific but serves one of the top-5 e-commerce markets globally.

### Razorpay / PayU Provider (India)
**Why:** India has no provider coverage; Razorpay and PayU are the dominant gateways covering UPI, net banking, and local cards — the top non-card payment methods in the world's most populous country.
**Complexity:** High
**Multi-tenant relevance:** Tenants targeting India must use a local gateway to collect payments; Stripe's India coverage is limited and expensive.
**Multi-country relevance:** India represents a uniquely large and fast-growing market with very specific payment infrastructure requirements.

### BNPL Provider Abstraction (Klarna / Afterpay / Tabby)
**Why:** Buy Now Pay Later is a significant and growing payment method in the EU, US, UK, Australia, and the Middle East; no BNPL provider is modeled.
**Complexity:** High
**Multi-tenant relevance:** Tenants selling higher-ticket items benefit significantly from BNPL availability.
**Multi-country relevance:** BNPL penetration and preferred providers vary by country (Klarna in EU/UK, Afterpay in AU/US, Tabby in MENA).

## Security

### ✅ Credential Encryption at Rest
**Why:** Provider API keys and private keys are stored as plain strings in the `settings` table via `SettingService`; a database breach exposes all tenant payment credentials.
**Complexity:** High
**Multi-tenant relevance:** Credential isolation is already per-tenant; adding encryption ensures a breach of one tenant's DB row does not expose another's.
**Multi-country relevance:** GDPR, PCI-DSS, and various national data-protection laws require sensitive credentials to be encrypted at rest.

### Token-Based Credential Rotation Without Downtime
**Why:** Rotating a provider API key requires a manual settings update with no way to test the new credential before switching, risking a checkout outage during rotation.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant rotates credentials on its own schedule; the platform must support rotation without affecting other tenants.
**Multi-country relevance:** Some regional providers (e.g. Alipay, WeChat Pay) enforce periodic certificate rotation by policy.

### PayPal OAuth Token Storage Security
**Why:** PayPal access tokens are cached in a static in-memory `Map` keyed by `tenantId`; a process restart clears the cache but the tokens are not encrypted or securely stored, and they survive for their full OAuth lifetime in memory.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants sharing the same process share the same token cache; a memory-inspection vulnerability could expose one tenant's token to another.
**Multi-country relevance:** PayPal is used globally; token leakage is a universal risk.

## Observability & Monitoring

### Provider Latency and Error Rate Metrics
**Why:** There are no metrics emitted per provider call (latency, success/failure rate, timeout); provider degradation is only observable after customer-facing impact.
**Complexity:** Medium
**Multi-tenant relevance:** A slow provider affects all tenants using it; early detection requires aggregate metrics across tenants.
**Multi-country relevance:** Regional provider reliability varies significantly (e.g. YooKassa latency in Russia vs. Stripe latency globally); per-provider metrics reveal regional SLA gaps.

### ✅ Provider Circuit Breaker
**Why:** If a provider's API is degraded or returning errors, all checkout attempts for tenants using that provider will fail with full request latency; there is no circuit breaker to fail fast and surface a degraded status.
**Complexity:** High
**Multi-tenant relevance:** A tenant with many concurrent checkouts during a provider outage will generate significant error logs and customer complaints; a circuit breaker limits the blast radius.
**Multi-country relevance:** Regional providers experience region-specific outages; a circuit breaker per provider prevents one region's provider outage from cascading.

## Localization

### Provider Error Code → Locale-Aware User Message Mapping
**Why:** Raw provider error codes (`card_declined`, `insufficient_funds`, Iyzico `8` / `9`) are passed through without mapping to human-readable, localized error messages.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant can configure its preferred language for error messages displayed to buyers.
**Multi-country relevance:** Turkish buyers using Iyzico, Russian buyers using YooKassa, and Chinese buyers using Alipay each need error messages in their own language.

### ✅ Locale-Aware Amount Formatting Utility
**Why:** The module re-exports currency metadata (`getCurrencyByCode`) but provides no utility to format a numeric amount as a locale-aware string (e.g. `1.234,56 TL` vs. `¥1,235` vs. `$1,234.56`).
**Complexity:** Low
**Multi-tenant relevance:** Admin UIs and invoice templates for each tenant need amounts formatted for that tenant's locale.
**Multi-country relevance:** Amount formatting conventions differ dramatically across countries; a shared utility prevents inconsistent display in every consuming module.
