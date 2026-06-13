# Good to Have — Exchange Rate

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Multi-Currency Support

### ✅ Additional Currency Pairs Beyond USD/TRY
**Why:** The service today only supports `USD <-> TRY` and throws `UNSUPPORTED_PAIR` for everything else. Any tenant pricing their subscription plans in EUR, GBP, CAD, or AED cannot convert to TRY at checkout, and no cross-currency conversion is possible for any other market.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants whose plans are priced in non-USD currencies (common for EU or GCC-focused SaaS products) are completely blocked from TRY checkout.
**Multi-country relevance:** Essential: the TCMB XML feed already publishes rates for EUR, GBP, CHF, JPY, AED, and dozens more — the code simply does not parse them yet.

### ✅ Cross-Rate Derivation via Base Currency
**Why:** Rather than fetching pair-specific rates, all rates can be expressed relative to TRY (the TCMB feed's base) and cross-rates (e.g. EUR→USD) can be derived as `EUR/TRY ÷ USD/TRY`. This gives O(1) query-time for any pair without additional API calls.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants in different currency zones can then all be served by the same cached TCMB snapshot.
**Multi-country relevance:** Eliminates the need to add per-pair logic; any country-currency pair supported by TCMB is automatically available.

---

## Multiple Rate Sources / Provider Abstraction

### ✅ Secondary FX Data Provider (Fallback)
**Why:** The service uses a single source (TCMB) with a 30-day "last known good" fallback. If TCMB changes its XML schema or URL, the service degrades silently to stale data for up to 30 days. A secondary provider (ECB, Open Exchange Rates, Frankfurter.app) as a hot-standby or cross-check would eliminate this single point of failure.
**Complexity:** Medium
**Multi-tenant relevance:** All tenants share the same FX feed; a TCMB outage or schema change simultaneously breaks checkout for every tenant.
**Multi-country relevance:** TCMB is authoritative only for TRY. For non-TRY markets (e.g. EUR-base with conversion to GBP), the ECB is more appropriate and legally recognised in some jurisdictions.

### ✅ Provider Abstraction Layer
**Why:** The rate-fetch logic (`getUsdTry`) is tightly coupled to TCMB's XML format, URL, and cache-key naming. Swapping or adding a provider requires editing the core service file. A `FxProvider` interface (similar to the `InvoiceAdapter` pattern already used in this codebase) would allow pluggable providers without changes to the core service.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators could select a provider per deployment environment (TCMB for TR prod, ECB mock for EU dev).
**Multi-country relevance:** Different country deployments may be legally required to use their central bank's official rate (TCMB for TR, ECB for EU, RBI for IN).

### Real-Time Rate Source for High-Volatility Markets
**Why:** TCMB publishes once per business day (~15:30 TRT). For high-volatility markets or large-value transactions (e.g. TRY during macroeconomic events), a 6-hour-old rate can represent a material pricing error. An optional real-time source (e.g. a commercial FX API) with a shorter TTL could be used when volatility exceeds a threshold.
**Complexity:** High
**Multi-tenant relevance:** Platform operators, not individual tenants, would configure the real-time source; but high-transaction-value tenants benefit most.
**Multi-country relevance:** TRY is one of the higher-volatility EM currencies; the need is acute for TR but applies broadly to any EM currency the platform may add.

---

## Caching and Resilience

### Per-Currency Cache Keys
**Why:** All rate data is stored under `fx:tcmb:usdtry` and `fx:tcmb:usdtry:last`. Extending to multiple currencies requires a generalised key scheme (e.g. `fx:tcmb:rate:{from}:{to}`) so each pair is independently cached and invalidated without a full cache flush.
**Complexity:** Low
**Multi-tenant relevance:** All tenants share the cache; a badly-behaved key for one currency pair should not invalidate rates for all pairs.
**Multi-country relevance:** Prerequisite for any multi-currency rollout.

### ✅ Cache Warmup Job
**Why:** On a cold Redis restart (e.g. after a deploy or Redis failure), the first request for each currency pair triggers a live TCMB fetch. Under simultaneous load, `singleFlight` helps but there is still one live request per server process. A scheduled warmup job (e.g. every 4 hours) could pre-populate the cache before it expires, eliminating cold-start latency spikes at checkout.
**Complexity:** Low
**Multi-tenant relevance:** All tenants are affected simultaneously by a cold cache; a warmup job benefits the entire platform.
**Multi-country relevance:** Warmup is especially important during market-open hours (08:00–10:00 TRT) when checkout traffic is highest and TCMB rates have just been updated.

### ✅ Rate Staleness Alerting
**Why:** When the TCMB fetch fails and the stale rate is served, a `Logger.warn` is emitted but there is no metric, alert, or admin notification. In production, a stale rate served for hours could cause meaningful pricing errors.
**Complexity:** Low
**Multi-tenant relevance:** Platform ops team needs a signal to act; all tenants are affected.
**Multi-country relevance:** Regulators in some jurisdictions (TR BDDK, EU MiFID adjacent) may require documentation of rate data quality; silent stale-rate serving makes auditing impossible.

---

## API Surface and Integration

### HTTP API Endpoint for FX Rates
**Why:** The module is currently in-process only (no API routes). External systems (mobile apps, third-party integrations, checkout pages) that need to display a live price in the local currency must go through the full Next.js server-side path. A lightweight `GET /api/fx/rate?from=USD&to=TRY` route would allow frontend components to fetch the rate without a full page load.
**Complexity:** Low
**Multi-tenant relevance:** Tenant-level rate display (showing "≈ 935 TRY" next to a plan price in USD) is a common UX requirement.
**Multi-country relevance:** Essential for multi-currency storefronts where the displayed price must track the live rate, not a hardcoded exchange rate baked into the product catalog.

### Rate History Storage
**Why:** There are no historical rate records stored in the database. If a customer disputes a charge amount ("why was I charged 935 TRY for a $29 plan?"), the platform cannot reconstruct the exchange rate that was in effect at transaction time. The rate used at checkout should be persisted alongside the payment record.
**Complexity:** Medium
**Multi-tenant relevance:** Dispute resolution and audit trails are per-tenant obligations.
**Multi-country relevance:** Consumer protection law in Turkey (TKHK), the EU (Consumer Rights Directive), and many other jurisdictions requires that the exchange rate used in a transaction be disclosed and retrievable.

---

## Localisation and Legal

### ✅ Configurable Rounding Mode per Currency
**Why:** `convert()` rounds to 2 decimal places using half-up rounding, which is correct for most currencies. JPY and KWD use 0 and 3 decimal places respectively. A hardcoded 2-dp rounding produces incorrect amounts for these currencies.
**Complexity:** Low
**Multi-tenant relevance:** Tenants billing in non-standard-precision currencies get incorrect totals.
**Multi-country relevance:** ISO 4217 defines different minor unit precision per currency; a production multi-currency platform must respect these.

### ✅ Bid/Ask Spread Support
**Why:** TCMB publishes both `ForexBuying` and `ForexSelling` rates. The service always uses `ForexSelling`. For some checkout flows (e.g. refunds, where the bank buys back currency), the buying rate is the correct one to apply. Exposing the rate type as a parameter would allow callers to choose the appropriate rate.
**Complexity:** Low
**Multi-tenant relevance:** Tenants processing refunds across currencies need the correct directional rate to avoid systematic over- or under-refunding.
**Multi-country relevance:** This is particularly relevant for cross-border B2C merchants where currency conversion happens on both the charge and the potential refund path.
