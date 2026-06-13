# Good to Have — Tenant Subscription Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Billing & Plan Management

### Per-Tenant Configurable Payment Provider (Not Hardcoded Stripe/IYZICO)
**Why:** The default provider for hosted checkout is hardcoded to `'STRIPE'` and for card/quote to `'IYZICO'`; tenants in different countries expect to pay via their local preferred provider (PayPal in the US, iDEAL in the Netherlands, Pix in Brazil).
**Complexity:** Medium
**Multi-tenant relevance:** A multi-country SaaS platform cannot mandate a single payment provider — the fallback should read a per-tenant or per-region `defaultPaymentProvider` setting.
**Multi-country relevance:** Local payment method preference is strong: 69% of Dutch consumers prefer iDEAL, 40% of Brazilian transactions are Pix, and Turkish users heavily use iyzico and BKM Express — a hardcoded provider alienates entire markets.

### Multiple Active Subscriptions per Tenant (Add-ons)
**Why:** `TenantSubscription` has a `@Unique(['tenantId'])` constraint — a tenant can only have one subscription row; add-on plans (e.g., extra storage, extra seats) cannot be purchased alongside a base plan.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants commonly combine a base plan with capacity add-ons; the single-subscription model forces operators to build add-ons as custom feature flags rather than real billing products.
**Multi-country relevance:** EU VAT rules require each chargeable line item to carry its own VAT entry; multiple subscriptions per tenant are a prerequisite for accurate per-item VAT calculation.

### Proration on Mid-Cycle Plan Upgrade/Downgrade
**Why:** `assignPlan` unconditionally resets `currentPeriodStart` to `now` — a tenant upgrading from Monthly to Yearly on day 15 of a paid month loses 15 days of credit; there is no proration calculation.
**Complexity:** High
**Multi-tenant relevance:** Fair proration is a standard billing expectation; tenants who feel they were overcharged will churn, and fair handling builds trust.
**Multi-country relevance:** EU consumer-protection law (Consumer Rights Directive 2011/83/EU) and UK Consumer Contracts Regulations require fair pricing on plan changes; unprorated billing can be challenged as an unfair commercial practice.

### Subscription Invoice Generation and PDF Download
**Why:** Payment records exist but there is no invoice-generation service that produces a formatted PDF with line items, VAT breakdown, and the tenant's billing address — required for enterprise customers to claim expenses or input-VAT deductions.
**Complexity:** High
**Multi-tenant relevance:** Every tenant that pays needs a PDF invoice with their company name, address, VAT number, and the platform's VAT details — the absence of invoices is a blocker for enterprise sales.
**Multi-country relevance:** EU VAT Directive (2006/112/EC) Art. 226 mandates specific invoice fields (VAT number, supply date, unit price, VAT amount); Turkish Revenue Administration requires e-invoice (e-fatura) for companies above a turnover threshold; invoicing rules differ in every jurisdiction.

### Dunning Management (Failed Payment Retry Schedule)
**Why:** `startGracePeriod` sets a grace window but there is no automated retry schedule — when a payment fails, the tenant enters grace but no retry attempt is made before the grace period expires and the subscription is downgraded.
**Complexity:** High
**Multi-tenant relevance:** Recovering failed payments via a retry schedule (e.g., Day 1, Day 3, Day 7) significantly reduces involuntary churn; each tenant's subscription should have its own retry state.
**Multi-country relevance:** US credit card networks require merchants to follow specific retry rules (Visa Retry Advice Codes, Mastercard Merchant Advice Codes) to avoid card scheme fines — a dunning engine must encode these rules per card network.

### Per-Tenant or Per-Plan Grace Period Length
**Why:** `getGracePeriodDays()` reads only `ROOT_TENANT_ID` — the grace window is the same for all tenants regardless of plan; enterprise tenants on annual plans might reasonably expect a longer grace window than monthly free-trial users.
**Complexity:** Low
**Multi-tenant relevance:** Billing fairness: a tenant on a $2,000/month enterprise plan should get more leniency than a $9/month starter plan when payment fails.
**Multi-country relevance:** No direct country relevance, but SLA commitments in enterprise contracts often include guaranteed access windows that the global grace period may not satisfy.

## Feature Gating

### ✅ Usage-Based Feature Gating Against Real-Time `TenantUsage` Counters
**Why:** `checkFeatureAccess` for `LIMIT` features compares a caller-supplied `currentCount` against the plan limit, but the caller is responsible for fetching the count — `MAX_AI_REQUESTS` should be automatically checked against `TenantUsage.aiTokens` without the route needing to manually count.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's usage counter is isolated in Redis/DB; the feature gate should pull from it directly rather than trusting caller-supplied counts, which can be stale or incorrect.
**Multi-country relevance:** No direct country relevance, but automated metering reduces the risk of over-provisioning that could expose the operator to free-tier abuse at scale.

### ✅ Feature Access Audit Trail When Access Is Denied
**Why:** `assertFeatureAccess` throws an error but the denial is not logged to the audit log — a tenant hitting a feature wall repeatedly has no record in the audit log for support investigations.
**Complexity:** Low
**Multi-tenant relevance:** Support teams debugging "why can't I use X?" for a specific tenant need a queryable record of feature denials and the plan limit that was hit.
**Multi-country relevance:** GDPR Art. 22 (automated decision-making) requires that decisions affecting users (including access denial) are explainable and auditable — a denial log satisfies this.

## Compliance & Tax

### VAT / Tax Collection Per Country of Tenant
**Why:** Prices are stored as `basePrice` in a single currency with no tax layer — there is no VAT calculation, tax rate lookup, or tax-inclusive pricing for EU, UK, or Australian tenants.
**Complexity:** High
**Multi-tenant relevance:** Each tenant pays from a different country with different VAT obligations — the subscription charge must apply the correct tax rate based on the billing address.
**Multi-country relevance:** EU OSS (One Stop Shop) VAT, UK MTD (Making Tax Digital), Australian GST, Turkish KDV, and Brazilian ICMS/ISS each have different rates, exemptions, and filing obligations — a tax-unaware billing system creates legal exposure in every market where tenants operate.

### Subscription Billing Address and Tax ID Storage
**Why:** There is no billing address or VAT/GST/TIN field on the tenant or subscription — invoices cannot be generated with legally required customer details.
**Complexity:** Low
**Multi-tenant relevance:** Every tenant paying for a subscription needs their billing address and tax number on their invoice; this data does not exist in the current schema.
**Multi-country relevance:** EU VAT invoicing (Art. 226), Turkish e-invoice mandate, and US state sales tax compliance all require verified buyer address and tax ID on every invoice — these fields are mandatory for legal compliance.

## Localization

### Plan and Feature Descriptions in Multiple Languages
**Why:** `SubscriptionPlan` and `PlanFeature` store a single `name`/`label` string — there is no i18n support for plan names, feature labels, or upgrade prompts in the tenant's configured language.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant operating in a non-English market needs plan names and feature descriptions in their language; English-only plan UI reduces conversion in those markets.
**Multi-country relevance:** Turkish, German, French, and Japanese enterprise customers expect all billing-facing UI strings to be in their language — an English-only plan table is a sales blocker in these markets.

## Developer Experience

### ✅ Webhook for `subscription.cancelled` and `subscription.expired`
**Why:** `cancelSubscription` does not emit a webhook — integrators cannot react to cancellation events (e.g., trigger a win-back campaign, notify a CRM, disable access in a downstream service).
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's subscription state is consumed by external systems (billing platforms, CRMs, support tools) that need real-time event notifications.
**Multi-country relevance:** No direct country relevance, but event-driven integrations are the standard architecture pattern for modern SaaS billing across all markets.
