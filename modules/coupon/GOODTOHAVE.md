# Good to Have — Coupon

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Geographic Restriction

### Geo-Restricted Coupons
**Why:** Promotional campaigns are typically country- or region-specific (e.g. a Black Friday code valid only in the US, or a launch discount for a new market). There is no country or region field in `CouponScope` today.
**Complexity:** Low
**Multi-tenant relevance:** A tenant running campaigns in multiple markets can issue different codes per country without needing separate tenants.
**Multi-country relevance:** Prevents cross-border code leakage — a TR-market code should not be redeemable by a US customer paying in USD via Stripe.

### Currency-Aware Minimum Amount
**Why:** `scope.minimumAmount` is a raw number with no currency context. A `minimumAmount: 50` threshold means something very different in USD vs TRY (as of 2025, ~1650 TRY). Minimum thresholds need a paired currency to be comparable.
**Complexity:** Low
**Multi-tenant relevance:** Tenants whose base currency differs from `coupon.currency` cannot express accurate spend thresholds today.
**Multi-country relevance:** Essential for multi-currency storefronts where a single coupon might be evaluated against carts in different currencies.

---

## Per-Tenant Limits and Quotas

### Max-Uses-Per-User Gate
**Why:** `maxUsesPerTenant` limits how many times a single coupon can be redeemed across the entire tenant. There is no `maxUsesPerUser` cap, so a single authenticated user can redeem the same coupon repeatedly (up to `maxUses`).
**Complexity:** Low
**Multi-tenant relevance:** Different tenants may want different per-user redemption policies (1 per user vs unlimited).
**Multi-country relevance:** Fraud patterns differ by market; markets with higher fraud rates benefit from stricter per-user caps.

### Per-Plan-Tier Coupon Quotas
**Why:** The platform subscription plan controls feature access via `FEATURE_INVOICING` etc., but there is no mechanism for limiting how many active coupons a tenant on a Basic plan may create versus a Pro plan.
**Complexity:** Medium
**Multi-tenant relevance:** Directly enforces plan-tier value differentiation for the SaaS layer.
**Multi-country relevance:** Low direct impact, but plan tiers are commonly localized.

---

## Provider Sync

### Per-Tenant Stripe Connect Sync
**Why:** `StripeCouponProvider.getClient()` reads `stripeSecretKey` from `ROOT_TENANT_ID`, so every tenant's coupon is synced to the platform's Stripe account. Tenants who use Stripe Connect (their own Stripe account) need coupon sync to their own account, not the platform's.
**Complexity:** Medium
**Multi-tenant relevance:** Without this, Stripe-native discount flows (customer portal, subscription coupons) are unusable for tenants with their own Stripe Connect account.
**Multi-country relevance:** Stripe Connect is the standard for multi-country marketplace models; each country's legal entity may have its own Stripe account.

### PayPal and Iyzico Native Discount Sync
**Why:** Both `PaypalCouponProvider` and `IyzicoCouponProvider` are no-ops — discounts are applied server-side by reducing the amount. PayPal Promotions API and iyzico basket-item discounts both support native discount objects that improve customer-facing receipts and payment provider reporting.
**Complexity:** High
**Multi-tenant relevance:** Tenants using PayPal (common in EU/US) or iyzico (TR) cannot show branded discount line items in the payment provider's checkout UI.
**Multi-country relevance:** iyzico is TR-specific; PayPal is the dominant alternative in many non-Stripe markets (DE, NL, AU).

---

## Bulk and Campaign Operations

### Bulk Coupon Generation
**Why:** Marketing campaigns typically require thousands of unique single-use codes (e.g. codes printed on packaging or sent via email). Today coupons must be created one at a time via the admin API.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant runs independent campaigns; batch generation must be scoped and quota-limited per tenant.
**Multi-country relevance:** Country-specific campaigns (localised promotions, regulatory requirements) often require large volumes of unique codes per market.

### Coupon Import via CSV
**Why:** Tenants migrating from another platform or running offline campaigns need to upload existing coupon batches. There is no import endpoint or background job for bulk ingestion.
**Complexity:** Medium
**Multi-tenant relevance:** Common request during tenant onboarding; reduces manual setup time for new tenants with existing promotion databases.
**Multi-country relevance:** Legacy data from country-specific ERPs (e.g. SAP, Logo) is typically exported as CSV.

---

## Analytics and Reporting

### Per-Coupon Analytics Dashboard
**Why:** The only redemption data exposed is a raw paginated list (`getRedemptionsByTenant`). There are no aggregates: revenue saved, redemption rate (used / maxUses), time-series charts, or top-redeeming users.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant admins cannot evaluate campaign ROI without aggregated data.
**Multi-country relevance:** Reporting by country/currency is needed to compare campaign performance across markets.

### Coupon Revenue Attribution
**Why:** `CouponRedemption` records the discount amount and the `paymentId`, but there is no join back to orders/subscriptions to compute incremental revenue attributed to the coupon. Revenue attribution (did the coupon drive a net-new customer?) is a standard marketing metric.
**Complexity:** High
**Multi-tenant relevance:** Each tenant has independent sales pipelines; attribution must be scoped per tenant.
**Multi-country relevance:** Incremental revenue attribution needs to account for currency conversion when comparing cross-country campaign results.

---

## Validation Robustness

### Race-Condition-Safe `maxUses` Enforcement
**Why:** `validate()` reads `usedCount` from the Redis cache and compares it to `maxUses`, but `apply()` increments via SQL `INCREMENT`. Between cache read and the DB increment, concurrent requests can each see `usedCount < maxUses` and all succeed — overshooting the limit. A database-level `WHERE usedCount < maxUses` conditional update or pessimistic lock is needed.
**Complexity:** Medium
**Multi-tenant relevance:** High-traffic tenants with viral coupons are most exposed; the risk is proportional to concurrency.
**Multi-country relevance:** Flash sale campaigns in high-traffic markets (e.g. a Singles Day promo in TR) are particularly vulnerable to concurrent over-redemption.

### Coupon Code Entropy Validation
**Why:** The DTO accepts any 3–32 character uppercase code matching `[A-Z0-9_-]+`. Short codes (e.g. `ABC`) are trivially guessable. There is no minimum entropy requirement or rate-limit escalation after failed attempts beyond the existing negative cache.
**Complexity:** Low
**Multi-tenant relevance:** A tenant with a short coupon code is exposed to brute-force enumeration that could exhaust `maxUses` fraudulently.
**Multi-country relevance:** Markets with higher fraud rates (emerging markets, new tenant markets) benefit most from entropy enforcement.

---

## Localisation

### Localised Coupon Names and Descriptions
**Why:** `name` and `description` are single strings with no i18n. A tenant operating in TR and EU needs to display the coupon name and description in the customer's language at checkout.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants decide which locales to support; the module should store and serve locale-keyed strings without the tenant needing to create duplicate coupon records.
**Multi-country relevance:** Core requirement for any multi-language storefront — especially for markets like CH (DE/FR/IT) or BE (NL/FR).
