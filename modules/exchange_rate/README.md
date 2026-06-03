# Exchange Rate Module

Live foreign-exchange rates from **TCMB** (Türkiye Cumhuriyet Merkez Bankası), with
Redis caching. Its sole purpose today is to convert subscription prices into **TRY**
when a Turkish card pays via **iyzico** (see [`tenant_subscription`](../tenant_subscription/README.md)).
A shared, stateless infrastructure service — no entities, no settings, no per-tenant state.

---

## Why

iyzico settles Turkish cards in Turkish Lira. Plans are usually priced in USD, so at
checkout the base price is converted to TRY using the official TCMB selling rate
(consumed from `tenant_subscription`'s `payWithCard` / `quote`).

---

## Service / Responsibilities

`ExchangeRateService` (default export, all-static — no instance, no DB):

| Method | Responsibility |
|---|---|
| `getRate(from, to)` | Multiplicative rate so `amountTo = amountFrom * rate`. Returns `1` for identity pairs, `getUsdTry()` for `USD→TRY`, and `1 / getUsdTry()` for `TRY→USD`. Throws `UNSUPPORTED_PAIR` for anything else. |
| `convert(amount, from, to)` | Resolves `getRate` then returns `amount * rate`, rounded half-up to 2 decimals. |
| `getUsdTry()` *(private)* | TRY per 1 USD from TCMB `ForexSelling`. Served from the fresh Redis cache when warm; otherwise refetched under `singleFlight`, falling back to the durable last-known value on a TCMB outage. |
| `parseUsdSelling(xml)` *(private)* | Parses the TCMB XML with `fast-xml-parser`, finds the `USD` currency (`CurrencyCode`/`Kod`), and reads `ForexSelling`. Throws `PARSE_FAILED` on malformed/missing data. |

There are no entities (no `*.entity.ts`), no API routes, and no settings in this module.

---

## API (in-process)

```ts
import { ExchangeRateService } from '@/modules/exchange_rate'

// Multiplicative rate: amountTo = amountFrom * rate
const rate = await ExchangeRateService.getRate('USD', 'TRY') // e.g. 32.2567

// Convenience: convert + round half-up to 2 decimals
const tryAmount = await ExchangeRateService.convert(29, 'USD', 'TRY') // e.g. 935.44
```

- Supported pairs: `USD <-> TRY` (and identity). Other pairs throw `UNSUPPORTED_PAIR`.
- Source: `https://www.tcmb.gov.tr/kurlar/today.xml`, parsing `Currency[CurrencyCode="USD"].ForexSelling`.
- `ExchangeRateQuoteSchema` (`exchange_rate.types.ts`) is the zod shape for a resolved
  quote: `{ from, to, rate }` (3-letter codes, positive rate).

---

## Caching & resilience

Two Redis keys back the service (constants in `exchange_rate.service.ts`):

| Key | TTL | Role |
|---|---|---|
| `fx:tcmb:usdtry` | ~6h (`CACHE_TTL`, jittered) | Fresh USD `ForexSelling` (TRY per 1 USD). |
| `fx:tcmb:usdtry:last` | 30d (`LAST_TTL`) | Durable "last known good", served only on a TCMB outage. |

- TCMB publishes once per business day (~15:30 TRT), so the ~6h fresh cache is plenty.
- Concurrent misses are de-duplicated with `singleFlight`.
- The fetch uses an 8s timeout (`FETCH_TIMEOUT_MS`).
- If TCMB is unreachable, the **last cached value** is served (logged via `Logger.warn`)
  rather than blocking a checkout. Only a cold cache (no value ever fetched) surfaces
  `RATE_UNAVAILABLE`.

### Messages (`exchange_rate.messages.ts`)

`FETCH_FAILED`, `PARSE_FAILED`, `UNSUPPORTED_PAIR`, `RATE_UNAVAILABLE` — the human-readable
strings thrown/logged by the service.

---

## Extending

Today only USD/TRY is needed. TCMB publishes every currency it lists against TRY, so
adding more pairs is a matter of generalizing `getUsdTry` into a per-currency lookup
and deriving cross-rates via TRY.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A shared, stateless infrastructure service that fetches the official TCMB USD/TRY rate, caches it globally in Redis, and converts amounts at checkout; it has no per-tenant surface (no entities, settings, tenantId, or SettingService usage) and behaves identically for every tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Only the USD<->TRY currency pair is supported; any other pair throws UNSUPPORTED_PAIR. A tenant whose subscription products are priced in a non-USD base currency (e.g. EUR/GBP) cannot have prices converted to TRY at checkout. The supported pairs and provider are hardcoded. | `exchange_rate.service.ts: ExchangeRateService.getRate / getUsdTry (TCMB_URL constant)` | Currency support is global/hardcoded rather than driven by the per-tenant product currency set in tenant_subscription. Plausibly should be data/setting-driven so tenants billing in other currencies are supported; however, the FX source (TCMB) is genuinely a shared market feed, so the rate values themselves are correctly global — only the pair/provider coverage is the gap. | `supportedCurrencyPairs` |
| Cache TTLs (CACHE_TTL 6h, LAST_TTL 30d), fetch timeout (8s), and the TCMB feed URL are hardcoded constants shared across all tenants. | `exchange_rate.service.ts: CACHE_TTL / LAST_TTL / FETCH_TIMEOUT_MS / TCMB_URL` | Intentionally global: TCMB publishes one market-wide rate per business day, so a single shared cache and feed is correct and should NOT be made per-tenant. Listed only for completeness as a deliberately-global value, not a real per-tenant gap. | — |

---

## Dependencies

`requires`: `redis` (caching + `singleFlight`/`jitter`), `common`. Also uses `logger`,
`axios`, and `fast-xml-parser`. Consumed by `tenant_subscription` at card checkout.
