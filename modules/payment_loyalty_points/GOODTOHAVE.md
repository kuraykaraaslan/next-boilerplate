# Good to Have — Payment Loyalty Points

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Program Configuration

### Per-Tenant Default Tier Code
**Why:** The fallback tier `BRONZE` is a hardcoded constant; a tenant whose entry tier is named `STANDARD`, `STARTER`, or a localized code will get an inconsistent fallback that may not match any of their configured `LoyaltyTier` rows.
**Complexity:** Low
**Multi-tenant relevance:** Tenants fully own their tier ladder structure; the entry-level tier code should be per-tenant configuration.
**Multi-country relevance:** Tier naming conventions differ by culture and language; a configurable default accommodates localized tier hierarchies.

### Per-Tenant Default Point Expiry Policy
**Why:** Point expiry is only triggered when a caller explicitly passes `expiresInDays` per earn call; there is no tenant-wide default expiry window, so a tenant cannot enforce a "points expire in 365 days" policy without patching every earn call.
**Complexity:** Low
**Multi-tenant relevance:** Expiry policy is a core loyalty-program business decision that differs per tenant (e.g. airline programs expire in 18 months, retail programs in 12 months).
**Multi-country relevance:** Some jurisdictions (e.g. certain EU consumer protection rules) restrict how loyalty points can expire; per-tenant control is needed to comply with local law.

### Per-Tenant Earn Rate Configuration (Points per Currency Unit)
**Why:** The caller controls exactly how many points to grant per earn call; there is no tenant-configurable "earn 1 point per 1 USD" base rate that automatically converts a payment amount to points.
**Complexity:** Medium
**Multi-tenant relevance:** Earn rate is the primary lever a loyalty program manager adjusts; it should be a tenant setting, not caller-side business logic scattered across integration points.
**Multi-country relevance:** Earn rates are often currency-dependent (e.g. 1 point per 1 USD but 100 points per 100 TRY) and need per-currency or per-country overrides.

### Per-Tenant Multiplier Toggle
**Why:** Tier-multiplier application is controlled only by the per-request `applyMultiplier` flag; there is no tenant-level switch to enable or disable tier multipliers program-wide, making it easy to accidentally skip them.
**Complexity:** Low
**Multi-tenant relevance:** Some tenants may want a flat earn program (no multipliers) while others use tiered multipliers; this should be a program policy, not a per-call flag.
**Multi-country relevance:** Regulatory environments in some countries restrict bonus/multiplier schemes; a global toggle allows compliance without code changes.

## Redemption & Checkout Integration

### Points-to-Currency Conversion Rate
**Why:** There is no concept of how much a loyalty point is worth in monetary terms; the `redeem` method debits points but there is no conversion to a cart discount amount.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant sets its own point redemption value (e.g. 100 points = $1, 500 points = 1 TRY).
**Multi-country relevance:** Redemption rates should be currency-aware; a global points program serving multiple countries needs per-currency conversion rates.

### Maximum Redemption Per Transaction / Percentage Cap
**Why:** There is no cap on how many points a customer can redeem per order; a customer with a large balance could pay entirely with points, bypassing revenue entirely.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant sets its own redemption limits as a percentage of order value or a maximum point count per order.
**Multi-country relevance:** Redemption caps are a business policy that may vary by country (e.g. stricter limits in markets with high discount-seeking behavior).

### Checkout Integration Hook
**Why:** There is no standard hook or event that signals to the cart/checkout that a redemption has been applied; `payment_cart` and `payment_sell` cannot natively consume a loyalty discount without custom integration code per tenant.
**Complexity:** Medium
**Multi-tenant relevance:** Every tenant using both loyalty and cart modules needs this integration; it should be standardized in the module, not reimplemented per tenant.
**Multi-country relevance:** Loyalty redemption at checkout is a universal feature expectation across all target markets.

## Lot-Based / FIFO Point Tracking

### Per-Lot Remaining Balance Tracking
**Why:** The README explicitly notes that expiry is a "simple FIFO-by-lot pass" and that production needs "full lot-based tracking (per-lot remaining balances)"; partial redemptions from a lot are not tracked, enabling double-expiry bugs.
**Complexity:** High
**Multi-tenant relevance:** All tenants with point expiry enabled are exposed to double-expiry bugs under partial redemption scenarios.
**Multi-country relevance:** Programs in markets with legally mandated expiry transparency (EU consumer protection) require accurate per-lot accounting.

### Point Transfer Between Users (Gifting)
**Why:** There is no service method to transfer points from one user's account to another; gifting points is a common loyalty feature in retail and hospitality.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant configures whether point gifting is permitted and any daily/monthly transfer limits.
**Multi-country relevance:** Gifting is particularly popular in APAC markets (Japan, Korea, China) where social commerce and gifting are core engagement drivers.

## Tier Management

### Tier Downgrade on Lifetime Point Reset
**Why:** `lifetimePoints` only ever increases; there is no mechanism to re-evaluate tier if a program resets (e.g. annual tier review where points reset to zero).
**Complexity:** Medium
**Multi-tenant relevance:** Annual or periodic tier resets are a standard loyalty-program practice; the current model has no support for this.
**Multi-country relevance:** Airline and hotel loyalty programs (dominant in APAC and EU markets) routinely use annual tier reviews.

### Tier Benefits Enforcement
**Why:** `LoyaltyTier.benefits` is a `jsonb` column but the module does nothing with it; benefits are stored but never enforced or exposed through a structured access check.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant defines what benefits (discounts, free shipping, early access) each tier grants; these need to be evaluable by other modules.
**Multi-country relevance:** Benefit types differ by market (e.g. free shipping thresholds in the US vs. lounge access in travel programs globally).

## Observability & Analytics

### Loyalty Program Performance Metrics
**Why:** There are no aggregate queries for total points issued, redeemed, expired, or outstanding liability; program managers cannot assess program health or cost without building custom queries.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant needs its own metrics dashboard isolated from other tenants' program data.
**Multi-country relevance:** Program liability (outstanding unredeemed points) is a financial reporting requirement in some jurisdictions.

### Earn Event Sourcing / Webhook Dispatch
**Why:** `earn`, `redeem`, and `expire` mutations succeed silently; no event is dispatched that other modules (notifications, analytics, fraud detection) can subscribe to.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant may want to trigger notifications (email/push) on tier upgrade, low balance, or impending expiry.
**Multi-country relevance:** Marketing communication rules differ by country (GDPR in EU, CAN-SPAM in US); event sourcing lets per-tenant notification policies be applied by the notification module.

## Localization & Compliance

### Localized Tier Names and Benefit Descriptions
**Why:** Tier `name` and `benefits` are stored as plain strings with no i18n structure; a tenant serving multiple languages cannot store translated tier names in the database.
**Complexity:** Medium
**Multi-tenant relevance:** Multi-language tenants (e.g. a platform operating in both English and Arabic) need localized tier names.
**Multi-country relevance:** Displaying Bronze/Silver/Gold in Turkish (Bronz/Gümüş/Altın) or Arabic requires i18n support at the data layer.

### GDPR-Compliant Account Deletion
**Why:** There is no `deleteAccount` or `anonymizeAccount` method; deleting a user's loyalty account on GDPR erasure requests requires manual DB operations that may leave orphaned transaction rows.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant is a data controller under GDPR and must fulfill erasure requests for its users.
**Multi-country relevance:** GDPR (EU), KVKK (Turkey), PDPA (Thailand), and similar laws mandate right-to-erasure support in all user-facing data stores.
