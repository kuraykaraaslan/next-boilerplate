# Good to Have — Payment Sell

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Provider Gating & Routing

### Enforce Per-Tenant Enabled Provider List
**Why:** `createCheckout` accepts any provider from `PaymentProviderEnum` and routes it without checking if the tenant has that provider enabled; a tenant with only Iyzico credentials configured can still request Stripe, which fails only deep inside the provider with a raw `PROVIDER_NOT_CONFIGURED` error.
**Complexity:** Low
**Multi-tenant relevance:** Provider gating is a core multi-tenant capability; tenants should only be able to use providers they have explicitly configured and enabled.
**Multi-country relevance:** Regional provider licensing requirements mean a tenant in one country must not accidentally route through a provider they are not contracted to use in that region.

### Per-Tenant Default Provider
**Why:** `CreatePaymentDTO.provider` is required; there is no fallback when it is omitted, forcing every integration to hardcode a provider name instead of inheriting the tenant's configured default.
**Complexity:** Low
**Multi-tenant relevance:** Most tenants have one primary payment provider; a default eliminates boilerplate from every checkout integration point.
**Multi-country relevance:** A multi-country platform routes different tenant regions to different providers by default (Stripe for global, Iyzico for TR, YooKassa for RU); a per-tenant default makes this automatic.

### Smart Provider Routing (Fallback Chain)
**Why:** If the primary provider returns an error at checkout creation time, the transaction fails with no retry through an alternative provider.
**Complexity:** High
**Multi-tenant relevance:** Each tenant configures a priority-ordered provider list as its fallback chain.
**Multi-country relevance:** Provider availability varies by region and time; a fallback chain ensures checkout resilience during regional provider outages.

## Payment Lifecycle

### Payment Expiry Automation
**Why:** `EXPIRED` status exists and webhooks can set it, but the service has no scheduled job to expire `PENDING` payments whose session has timed out without a provider webhook; stale pending payments accumulate indefinitely.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant has pending payments from abandoned checkouts that should expire after a configurable window to keep financial records clean.
**Multi-country relevance:** Different providers use different session expiry windows (Stripe Checkout: 24h, Alipay: 15 min); per-provider expiry timing must match provider behavior.

### Idempotency Key on Checkout Creation
**Why:** `createCheckout` has no idempotency mechanism; a network timeout on the client side that triggers a retry will create a second `Payment` record and a second provider checkout session for the same intent.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants are exposed to duplicate checkout sessions, which cause double-billing risk.
**Multi-country relevance:** Network reliability varies by region; markets with higher latency (Russia, parts of APAC) have higher retry rates and therefore higher duplicate risk.

### Payment Link Generation (No Redirect)
**Why:** The only checkout flow is a redirect to a provider-hosted page or a client-embedded element; there is no `createPaymentLink` that returns a shareable URL a tenant can send to customers via email or SMS.
**Complexity:** Medium
**Multi-tenant relevance:** B2B tenants and service businesses commonly invoice customers with a payment link rather than an in-app checkout.
**Multi-country relevance:** Payment links are the primary checkout method in markets with lower app penetration (parts of MENA, Africa, South Asia).

### Order Bump / Upsell at Checkout
**Why:** There is no mechanism to attach additional line items or upsell offers to a checkout session; the `CreatePaymentDTO` models a single flat amount with no structured line-item breakdown.
**Complexity:** Medium
**Multi-tenant relevance:** E-commerce tenants depend on order bumps for average order value optimization.
**Multi-country relevance:** Checkout upsell norms differ by region; localized upsell copy requires i18n support that a line-item structure enables.

## Refunds

### Per-Tenant Refund Window Policy
**Why:** Refund eligibility is only gated by status (`COMPLETED` / `PARTIALLY_REFUNDED`); there is no configurable refund window (e.g. "refunds only within 30 days") enforced by the service.
**Complexity:** Low
**Multi-tenant relevance:** Refund policy is a per-tenant business decision; the service should read and enforce a tenant-configured `refundWindowDays` setting.
**Multi-country relevance:** Consumer protection law mandates minimum refund windows in many jurisdictions; a configurable policy allows tenants to set legally compliant defaults by country.

### Provider-Side Refund Status Tracking
**Why:** After calling `provider.refundPayment()`, the service immediately marks the payment `REFUNDED`; if the provider processes refunds asynchronously (e.g. bank transfers that take 5–10 business days), the record is inaccurate.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants processing bank-transfer or BNPL refunds are affected; the financial record is incorrect during the processing window.
**Multi-country relevance:** Refund settlement times differ massively by provider and country (instant for card networks in some markets, up to 10 days for bank transfers in others).

### Bulk Refund Capability
**Why:** There is no `bulkRefund` method; refunding a batch of orders (e.g. after a product recall or service outage) requires individual API calls per payment, which is operationally painful.
**Complexity:** Medium
**Multi-tenant relevance:** Any tenant facing a mass-refund event (subscription billing error, defective product batch) needs bulk tooling.
**Multi-country relevance:** Mass refund events are often jurisdiction-specific (e.g. regulatory recall in one country); bulk tooling scoped to a tenantId + filter set makes this practical.

## Tax & Compliance

### Tax Amount on Payment Record
**Why:** The `Payment` entity stores a flat `amount` with no breakdown of net/tax/shipping components; there is no `taxAmount` or `taxBreakdown` field, making tax reporting and reconciliation against `payment_tax` impossible.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant filing VAT/GST returns needs tax amounts per transaction; the current schema cannot support this without joining to other tables that may not exist.
**Multi-country relevance:** VAT/GST/sales tax reporting is mandatory in nearly every jurisdiction; the payment record must carry enough detail for tax filings.

### Invoice Auto-Generation on Payment Completion
**Why:** There is no automatic invoice generation when a one-time payment succeeds; tenants must manually trigger invoice creation from a separate module.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant needs invoices for every sale; automating this on `payment.completed` removes a critical manual step.
**Multi-country relevance:** Many countries (EU, Turkey, India, Brazil) legally require an invoice to be issued within a specific timeframe after payment; automation is the only way to ensure compliance.

### Electronic Invoice / E-Invoicing Integration
**Why:** There is no support for country-mandated e-invoicing systems such as Turkey's e-Fatura, Italy's SDI, or Brazil's NF-e, which must receive payment data within hours of a sale.
**Complexity:** High
**Multi-tenant relevance:** Tenants operating in mandated e-invoicing countries cannot legally operate without this integration, regardless of their size.
**Multi-country relevance:** E-invoicing mandates exist in Turkey, Italy, Poland, France (2024–2026 rollout), Brazil, Mexico, and many others; the list is growing.

## Fraud & Risk

### Velocity Check on Payment Attempts
**Why:** There is no rate limiting or velocity check on `createCheckout` per user/IP/card; a single compromised account or card can trigger unlimited payment attempts.
**Complexity:** Medium
**Multi-tenant relevance:** Excessive failed charges are billed by most providers (Stripe, Iyzico); the financial impact is per-tenant.
**Multi-country relevance:** Card-testing attack volumes differ by region; velocity thresholds should be configurable per tenant's risk profile.

### Payment Analytics and Conversion Tracking
**Why:** No metrics or events are emitted from checkout creation, success, or failure; tenants cannot measure conversion rates, revenue by provider, or payment success rates.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant needs isolated payment analytics to optimize its checkout.
**Multi-country relevance:** Conversion rates and provider success rates vary dramatically by country; per-country breakdowns are essential for multi-market optimization.
