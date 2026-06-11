# Good to Have — Payment

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Provider Management

### Per-Tenant Default Payment Provider
**Why:** The global `PAYMENT_DEFAULT_PROVIDER` env var forces every tenant to share the same default gateway; a Turkish tenant should default to Iyzico, a Russian tenant to YooKassa, and so on without requiring callers to always pass the provider explicitly.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant operates in a specific region and has a preferred gateway — today the default cannot be configured per tenant.
**Multi-country relevance:** Regional providers (Iyzico/TR, YooKassa/RU, Alipay/CN) are only useful if they can be the default for tenants in those countries.

### Per-Tenant Provider Enable Flags Actually Enforced
**Why:** The `stripeEnabled`, `paypalEnabled`, etc. setting keys are declared but never read — `getAvailableProviders()` returns all providers regardless, so a tenant's disable choice has no effect and checkout could be attempted against an unconfigured provider.
**Complexity:** Low
**Multi-tenant relevance:** A tenant should be able to restrict which payment methods it offers at checkout to match its licensed/configured gateways.
**Multi-country relevance:** Regulations in some countries (e.g. China, Russia) may require that only locally licensed providers are offered to buyers.

### Provider Health-Check / Connectivity Status
**Why:** There is no way to test if a tenant's provider credentials are valid before a live checkout attempt fails in front of a customer.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant manages its own API credentials; a broken key should surface in the admin UI before it impacts buyers.
**Multi-country relevance:** Sandbox vs. live mode mismatches are common when onboarding cross-regional providers.

## Fraud Detection & Risk

### Velocity-Check / Rate Limiting on Checkout Attempts
**Why:** No mechanism exists to block a user or IP that attempts many failed payments in a short window, enabling card-testing attacks.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant is billed by its payment provider for failed charges; card-testing is a direct financial cost to the tenant.
**Multi-country relevance:** Card-testing attack patterns differ by region; per-country velocity thresholds improve precision.

### Fraud Score Integration (Stripe Radar / 3rd-party)
**Why:** High-risk transactions (mismatched BIN country, unusual amount) have no automated review path — every suspicious payment is either accepted or rejected without a "review" middle state.
**Complexity:** High
**Multi-tenant relevance:** Risk tolerance varies by tenant business type (digital goods vs. physical); each tenant should configure its own review thresholds.
**Multi-country relevance:** Cross-border transactions (card country ≠ billing country) carry higher fraud risk and need automatic flagging.

### IP Geolocation / BIN Country Mismatch Alert
**Why:** The BIN check resolves the card's issuing country but no alert or block is triggered when it mismatches the buyer's IP country.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant can configure acceptable country-pair mismatches for its specific market.
**Multi-country relevance:** Cross-border fraud is significantly higher than domestic fraud; mismatch detection directly improves multi-country safety.

## PCI Compliance

### Card Data Never Touches Backend — CSP / SRI Enforcement Headers
**Why:** The module correctly avoids persisting raw card data, but there is no mechanism to enforce Content Security Policy headers that prevent injected scripts from exfiltrating it at the browser layer.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's checkout page may have different third-party integrations that need CSP carve-outs.
**Multi-country relevance:** PCI-DSS is a global standard but enforcement mechanisms (fines, audits) vary by card network and region.

### Audit Trail for All Card-Data-Touching Events
**Why:** Direct card charges (`chargeWithCard`, `start3dsCharge`) write no audit log entry; there is no record that a charge was attempted with raw card data for a given tenant at a given time.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant needs its own audit records to satisfy a PCI audit or dispute.
**Multi-country relevance:** GDPR and similar laws require proof that personal financial data (even if not persisted) was handled correctly.

## Currency

### Per-Tenant Default Settlement Currency (Wire the Declared Setting)
**Why:** The `currency` setting key is declared in `payment.setting.keys.ts` but never read; every call must pass currency explicitly or defaults silently to USD.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant operates in its own primary currency and should not need to pass it on every API call.
**Multi-country relevance:** Non-USD markets (EUR, GBP, TRY, CNY, RUB) are the majority of the global payment surface.

### Dynamic Currency Conversion (DCC) at Checkout
**Why:** Buyers see the price only in the merchant's currency; showing the equivalent in the buyer's local currency before checkout improves conversion, especially on cross-border purchases.
**Complexity:** High
**Multi-tenant relevance:** Each tenant can enable DCC independently for its market.
**Multi-country relevance:** DCC is required for good UX in cross-border commerce and is a standard feature in all major payment gateways.

### Zero-Decimal Currency Handling
**Why:** Currencies like JPY, KRW, and VND have no minor units; the amount math (stored as decimal 12,2) and the round2 helpers will produce incorrect amounts for these currencies.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant targeting East Asian markets must handle JPY/KRW correctly.
**Multi-country relevance:** Zero-decimal currencies are dominant in Japan, South Korea, Vietnam, and several other high-volume markets.

## Webhook Reliability

### Webhook Delivery Retry Queue with Exponential Backoff
**Why:** Inbound provider webhook handling is synchronous and one-shot; if the handler throws after a partial state change, the provider will retry but internal consistency may already be broken.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant's downstream failure (e.g., invoice service down) should not block other tenants' webhook processing.
**Multi-country relevance:** Regional provider webhooks (YooKassa, Alipay) have different retry windows and policies; a unified retry queue normalizes behavior.

### Idempotency Key Tracking for Webhook Events
**Why:** The webhook handler does not check if an event has already been processed; duplicate deliveries (common with Stripe) will double-apply state changes (e.g., marking a payment completed twice).
**Complexity:** Low
**Multi-tenant relevance:** Each tenant's processed event set must be tracked independently to avoid cross-tenant deduplication errors.
**Multi-country relevance:** Provider retry intervals and duplication rates vary by region; idempotency is essential for all providers.

### Alipay and WeChat Pay Webhook Handling
**Why:** The webhook service handles Stripe, PayPal, and Iyzico callbacks but has no handler for Alipay or WeChat Pay notifications; payments through these providers cannot be confirmed asynchronously.
**Complexity:** High
**Multi-tenant relevance:** Tenants targeting China use Alipay/WeChat exclusively; their payment lifecycle is broken without webhook handling.
**Multi-country relevance:** Alipay/WeChat are the dominant payment methods in China and carry significant cross-border transaction volume.

## Refunds & Disputes

### Chargeback / Dispute Intake and Tracking
**Why:** `PaymentTransaction` has a `CHARGEBACK` type but no service method, workflow, or webhook handler exists to create or manage chargebacks; dispute lifecycle is entirely manual.
**Complexity:** High
**Multi-tenant relevance:** Each tenant faces different chargeback rates depending on their product type and customer geography.
**Multi-country relevance:** Chargeback rules (timeframes, representment procedures) differ by card network and country.

### Partial Refund Accumulated Tracking
**Why:** `refundedAmount` is stored but there is no validation preventing the sum of all partial refunds from exceeding the original payment amount across multiple refund calls.
**Complexity:** Low
**Multi-tenant relevance:** All tenants are exposed to over-refund bugs under concurrent partial-refund scenarios.
**Multi-country relevance:** Over-refunding triggers provider-side errors with error messages in the provider's locale, making debugging harder in multi-country deployments.

## Localization

### Provider Error Message Localization
**Why:** `PAYMENT_MESSAGES` is a flat English string map; provider-side error codes (e.g., Iyzico Turkish error messages, YooKassa Russian) are passed through raw without translation.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant serving Turkish customers should surface Iyzico errors in Turkish, not raw English API strings.
**Multi-country relevance:** Localized error messages are a baseline UX requirement for non-English markets.

### Installment Plan Localization for Iyzico
**Why:** Iyzico installment counts (`iyzicoEnabledInstallments`) are stored as a plain string with no per-tenant UI labels or translated descriptions for the bank installment options shown to buyers.
**Complexity:** Low
**Multi-tenant relevance:** Turkish tenants configure installment options per their merchant agreement with the bank.
**Multi-country relevance:** Installment financing is a core purchase driver in Turkey and Latin America; proper localization of installment terms is a conversion factor.
