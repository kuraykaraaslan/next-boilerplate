# Good to Have — Payment Subscription

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Dunning & Recovery

### ✅ Automated Dunning Lifecycle (Retry → Grace → Cancel)
**Why:** `pastDueCount` is a column on the `Subscription` entity but it is never incremented by the service; there is no scheduled job, retry logic, or grace-period policy that progresses a `PAST_DUE` subscription toward cancellation or recovery.
**Complexity:** High
**Multi-tenant relevance:** Each tenant configures its own dunning schedule (e.g. retry on day 3, 5, 7; grace period 14 days) to balance revenue recovery against customer churn.
**Multi-country relevance:** Payment failure rates and recovery likelihood differ by country; sending dunning emails in the customer's language and respecting country-specific communication opt-out rules requires per-locale configuration.

### Failed Payment Notification to Subscriber
**Why:** When a payment fails and a subscription becomes `PAST_DUE`, there is no email or push notification sent to the subscriber (only a dunning email to tenant admins in the `payment` module's webhook handler); subscribers do not know their billing failed.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant customizes the dunning email template, timing, and language for its subscriber base.
**Multi-country relevance:** Notification timing and communication channel preferences differ by country; WhatsApp is preferred in some MENA markets, SMS in others, email universally.

### Smart Retry with Payment Method Updater
**Why:** There is no mechanism to suggest or accept an updated payment method from a subscriber before or after a payment failure; the only recovery path is cancellation or manual admin intervention.
**Complexity:** High
**Multi-tenant relevance:** Stripe's Account Updater and PayPal's Vault features automatically refresh expired card details; tenants using these should have the renewal flow consume updated payment method data.
**Multi-country relevance:** Card expiry rates differ by country and card network; automatic updater integration reduces involuntary churn in all markets.

## Billing Logic

### ✅ Proration with Real Calendar-Month Accuracy
**Why:** `CYCLE_DAYS` uses approximate day counts (MONTHLY=30, QUARTERLY=91, YEARLY=365); a mid-March upgrade produces different credit amounts than a mid-February upgrade due to month-length differences, which is incorrect.
**Complexity:** Medium
**Multi-tenant relevance:** Billing disputes from incorrect proration amounts are per-tenant customer service overhead; all tenants are affected.
**Multi-country relevance:** Calendar-correct proration is a legal requirement in jurisdictions where subscription billing is governed by consumer protection law (EU, UK, AU).

### Per-Tenant Proration Policy Configuration
**Why:** Proration defaults to `true` in the `ChangePlanDTO` with no tenant-level policy; tenants cannot configure "never prorate" or "always charge full new cycle price" as a house policy.
**Complexity:** Low
**Multi-tenant relevance:** Proration vs. no-proration is a fundamental SaaS billing policy choice; it should be a tenant setting.
**Multi-country relevance:** Some regulatory environments require crediting unused subscription time; others do not — per-tenant control enables legal compliance.

### Annual Plan Discount Calculation
**Why:** Plans wrap a `StoreProduct` with a single `basePrice`; there is no concept of a "pay annually, save X%" discount — a tenant must create two separate products at different prices and two separate plans, with no automated relationship.
**Complexity:** Medium
**Multi-tenant relevance:** Monthly vs. annual pricing with a discount is the most common SaaS pricing pattern; the module should natively support it.
**Multi-country relevance:** Annual plan discounts need to be expressed in the tenant's local currency and may need to account for local tax differences between billing frequencies.

### ✅ Metered / Usage-Based Billing Support
**Why:** The billing model is purely flat-rate; there is no mechanism for metered billing (e.g. "pay per API call", "pay per active seat") that reports usage and charges accordingly.
**Complexity:** High
**Multi-tenant relevance:** SaaS tenants in API, infra, and B2B segments almost universally offer some form of usage-based pricing.
**Multi-country relevance:** Usage-based pricing in cross-currency contexts (e.g. usage reported in USD but billed in TRY) requires exchange-rate integration at billing time.

### Mid-Period Quantity Changes (Seat-Based Billing)
**Why:** There is no concept of "quantity" or "seats" on a subscription; a team plan cannot be billed per seat, and adding seats mid-period has no proration support.
**Complexity:** High
**Multi-tenant relevance:** B2B SaaS tenants (the primary target for this boilerplate) almost always need seat-based billing.
**Multi-country relevance:** Seat-based billing in multi-currency deployments must apply currency conversion at the correct exchange rate for each quantity change event.

## Trial & Freemium

### Trial-to-Paid Conversion Without Payment Method at Trial Start
**Why:** `createSubscription` sets status to `TRIALING` based on `plan.trialDays`, but there is no "trial with card on file" vs. "trial without card" distinction; a subscriber on a free trial has no card attached, so the renewal event has nothing to charge.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant chooses whether to require a card at trial start; "card-free trials" reduce signup friction but increase churn risk.
**Multi-country relevance:** Card-free trial conversion rates vary by country; some markets (EU) have stricter regulations on charging a card without explicit renewed consent.

### Freemium → Paid Upgrade Tracking
**Why:** There is no event or metric emitted on the transition from `TRIALING` to `ACTIVE`; this is the most important conversion event in a SaaS funnel and is currently silent.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's growth team needs trial-to-paid conversion metrics to optimize onboarding.
**Multi-country relevance:** Conversion rates from trial to paid differ significantly by country; per-country data drives market-specific investments.

## Plan Catalog

### Per-Tenant Plan Visibility / Targeting Rules
**Why:** All plans are visible to all users within a tenant; there is no mechanism to show certain plans only to specific user segments (e.g. enterprise plans only to companies with verified tax IDs, or country-specific plans).
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant has plans targeted at different user segments; unrestricted visibility means users see plans they cannot or should not buy.
**Multi-country relevance:** Country-specific plans (e.g. a plan priced in TRY only for Turkish customers) should not be visible to international buyers who cannot pay in that currency.

### Plan Sunset / Migration Path
**Why:** `deletePlan` is blocked when active subscriptions reference the plan, but there is no `archivePlan` workflow that migrates existing subscribers to a replacement plan with communication and proration.
**Complexity:** High
**Multi-tenant relevance:** Sunsetting legacy plans is a routine SaaS operation; tenants need a safe migration path without mass cancellations.
**Multi-country relevance:** Plan migrations may require country-specific notice periods (e.g. 30 days in the EU for price increases).

### Public Pricing Page Data API
**Why:** There is no `listPublicPlans` endpoint that returns plan details safe for public display (without sensitive tenant-internal fields); every tenant must build its own pricing page data layer.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's pricing page is a different product; a standardized public API eliminates redundant implementation.
**Multi-country relevance:** A public pricing API should return prices in the viewer's local currency, requiring exchange-rate integration.

## Tax & Invoicing

### Subscription Tax Calculation Integration
**Why:** `Subscription.amount` is a flat amount with no tax component; there is no integration with `payment_tax` to compute VAT/GST on recurring charges before issuing a renewal invoice.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's tax obligations differ by its registered jurisdiction and the subscriber's country.
**Multi-country relevance:** EU VAT on digital services (MOSS/OSS), Australia GST, and Turkish KDV all apply to subscription charges at different rates depending on the subscriber's country.

### Automated Subscription Invoice Generation
**Why:** Renewal invoices are only created as "best-effort" in the `payment` module's webhook handler; the `payment_subscription` module itself has no invoice generation and the subscription record carries no `invoiceId` linkage.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant needs invoices for every subscription charge cycle for accounting and subscriber self-service.
**Multi-country relevance:** Many countries legally require an invoice to be issued within a specific timeframe after each billing cycle; automation is the only compliant path.

## Observability & Analytics

### ✅ Subscription MRR / ARR Calculation
**Why:** There are no aggregate service methods for Monthly Recurring Revenue, Annual Recurring Revenue, churn rate, or net revenue retention; these are the primary KPIs for any subscription business.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's revenue metrics are completely isolated; aggregate MRR must be computable per tenant.
**Multi-country relevance:** MRR reported in multi-currency must be normalized to a single reporting currency using exchange rates; per-country MRR breakdown supports regional expansion decisions.

### Subscription Lifecycle Webhook Completeness
**Why:** `subscription.renewed` is not dispatched by this module (it is handled in the `payment` module's webhook service); the `payment_subscription` module dispatches only 5 events but lacks `subscription.renewed`, `subscription.expired`, and `subscription.payment_failed`.
**Complexity:** Low
**Multi-tenant relevance:** Downstream systems (access control, notifications, analytics) that listen for subscription events need a complete event set.
**Multi-country relevance:** Country-specific regulatory actions (e.g. mandatory renewal notice before auto-renewal in some EU countries) are triggered by subscription lifecycle events.
