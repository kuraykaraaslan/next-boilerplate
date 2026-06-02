# Exchange Rate

Live foreign-exchange rates from **TCMB** (Türkiye Cumhuriyet Merkez Bankası), with
Redis caching. Its sole purpose today is to convert subscription prices into **TRY**
when a Turkish card pays via **iyzico** (see [`tenant_subscription`](../tenant_subscription/README.md)).

## Why

iyzico settles Turkish cards in Turkish Lira. Plans are usually priced in USD, so at
checkout the base price is converted to TRY using the official TCMB selling rate.

## API

```ts
import { ExchangeRateService } from '@/modules/exchange_rate'

// Multiplicative rate: amountTo = amountFrom * rate
const rate = await ExchangeRateService.getRate('USD', 'TRY') // e.g. 32.2567

// Convenience: convert + round half-up to 2 decimals
const try = await ExchangeRateService.convert(29, 'USD', 'TRY') // e.g. 935.44
```

- Supported pairs: `USD <-> TRY` (and identity). Other pairs throw `UNSUPPORTED_PAIR`.
- Source: `https://www.tcmb.gov.tr/kurlar/today.xml`, parsing `Currency[CurrencyCode="USD"].ForexSelling`.

## Caching & resilience

- The USD/TRY rate is cached in Redis under `fx:tcmb:usdtry` for ~6h (jittered).
  TCMB publishes once per business day (~15:30 TRT), so this is plenty fresh.
- Concurrent misses are de-duplicated with `singleFlight`.
- If TCMB is unreachable, the **last cached value** is served rather than blocking a
  checkout. Only a cold cache (no value ever fetched) surfaces `RATE_UNAVAILABLE`.

## Extending

Today only USD/TRY is needed. TCMB publishes every currency it lists against TRY, so
adding more pairs is a matter of generalizing `getUsdTry` into a per-currency lookup
and deriving cross-rates via TRY.
