# Good to Have — Payment Cart

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Currency & Pricing

### Per-Tenant Default Cart Currency
**Why:** The cart currency defaults to `USD` both in the DTO and the entity column; a tenant operating in EUR, TRY, or CNY gets silently wrong-currency carts whenever the caller omits the currency field.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has a primary operating currency; the default should come from tenant settings, not a global hardcoded constant.
**Multi-country relevance:** Non-USD markets are the majority of the global addressable audience; a wrong-currency default causes coupon validation mismatches and incorrect totals.

### Multi-Currency Line Items Within a Single Cart
**Why:** All `CartItem` rows share the cart's single `currency` field; there is no validation preventing items with different currencies from being added, which would make the subtotal calculation incorrect.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants that sell international products (e.g. a marketplace) may present items priced in different currencies.
**Multi-country relevance:** Cross-border carts are a fundamental multi-country scenario; the cart engine must either enforce single-currency or handle conversion.

### Real-Time Price Validation on Cart Mutations
**Why:** `unitPrice` is stored as supplied at add-time and never re-validated against the current catalog price; a stale price in a long-lived cart leads to revenue leakage or customer disputes.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's product prices are managed independently; a price change should propagate to open carts.
**Multi-country relevance:** Regional price changes (e.g. currency devaluation updates) need to reflect in existing carts immediately.

## Cart Lifecycle & Abandonment

### Cart Expiry and Abandonment Automation
**Why:** `expiresAt` is modeled on the entity but never set by the service; `ABANDONED` status exists but is never automatically applied; abandonment detection and cart cleanup rely entirely on seed data literals.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant should configure its own abandonment threshold (e.g. a flash-sale store: 30 minutes; a B2B store: 7 days) via a `cartExpiryDays` or `cartExpiryHours` setting.
**Multi-country relevance:** Session length expectations and shopping patterns differ by region; configurable abandonment windows accommodate this variation.

### Abandoned Cart Recovery Notification
**Why:** There is no hook or event emitted when a cart becomes abandoned, so no email/push recovery flow can be triggered.
**Complexity:** Medium
**Multi-tenant relevance:** Cart recovery emails are one of the highest-ROI retention tools; tenants should be able to enable/disable and customize them.
**Multi-country relevance:** Recovery email timing and messaging vary by locale and local marketing regulations (e.g. GDPR consent requirements in the EU).

### Cart Reservation / Stock Lock on Add
**Why:** Adding an item to the cart does not reserve inventory; two customers can both add the last unit of a product, and only one will succeed at checkout — with no warning earlier.
**Complexity:** High
**Multi-tenant relevance:** Tenants with limited-stock products (events, limited editions) need per-tenant inventory reservation policies.
**Multi-country relevance:** Flash sales common in Asian e-commerce markets require sub-second reservation to prevent oversell.

## Tax & Compliance

### Tax Calculation Integration at Cart Level
**Why:** The cart computes `subtotal` and `discountTotal` but has no `taxTotal` or `taxBreakdown` field; tax is not shown at cart stage, only (if at all) at checkout, which is a UX and regulatory gap.
**Complexity:** Medium
**Multi-tenant relevance:** Some tenants must display tax-inclusive prices from the first item addition (EU VAT requirement); others show tax at checkout only.
**Multi-country relevance:** EU (VAT-inclusive display), Australia (GST), India (GST breakdowns), and the US (state-level sales tax) all require different tax presentation at cart stage.

### Shipping Estimate at Cart Stage
**Why:** There is no `shippingTotal` or `estimatedShipping` on the cart; buyers cannot see total cost before checkout, leading to higher abandonment at the payment step.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants using the `payment_shipping` module should be able to wire estimated shipping into the cart view.
**Multi-country relevance:** International shipping costs are highly variable and are a top cart-abandonment reason for cross-border buyers.

## Promotions & Discounts

### Multiple Coupon / Promotion Stacking Rules
**Why:** The cart supports exactly one `couponCode`; applying a second coupon replaces the first with no configurable stacking policy.
**Complexity:** Medium
**Multi-tenant relevance:** Stacking rules (e.g. one coupon + one loyalty redemption) are a merchandising policy that varies per tenant.
**Multi-country relevance:** Promotional norms differ by region; some markets (US) are accustomed to coupon stacking, others (EU) less so.

### Loyalty Points Redemption Integration at Cart Level
**Why:** There is no field or service method to apply loyalty point redemptions to the cart; loyalty and cart are completely decoupled, forcing each tenant to implement the integration themselves.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants using the `payment_loyalty_points` module need a standardized way to apply point redemptions as cart discounts.
**Multi-country relevance:** Loyalty programs are a key retention mechanism in markets with high repeat-purchase rates (Asia, Middle East).

## Guest & Session Management

### Guest Token Expiry and Cleanup
**Why:** Guest carts identified by `guestToken` are never expired or cleaned up; they accumulate in the tenant DB indefinitely, growing the table and potentially leaking browsing data.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant has its own guest-cart retention policy and storage cost implications.
**Multi-country relevance:** GDPR and similar laws require that anonymous session data is not retained beyond the session; an expiry mechanism is a compliance necessity.

### Cart Sharing / Saved Cart (Named Carts)
**Why:** Users can have only one ACTIVE cart at a time; there is no concept of saving a cart for later or sharing a cart link with another user (e.g. for B2B procurement review).
**Complexity:** Medium
**Multi-tenant relevance:** B2B tenants commonly need quote/cart sharing workflows where a sales rep builds a cart for a buyer.
**Multi-country relevance:** B2B purchasing patterns (common in DACH, APAC enterprise markets) require cart sharing as a baseline feature.

## Observability

### Cart Conversion Rate Metrics
**Why:** There are no analytics hooks (events or metric counters) emitted on cart creation, item addition, conversion, or abandonment; conversion funnel analysis is impossible.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant needs its own conversion metrics to optimize its storefront.
**Multi-country relevance:** Conversion benchmarks vary significantly by country and product category; per-tenant metrics enable region-specific optimization.
