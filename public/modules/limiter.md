# Rate Limiter

- **id:** `limiter`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/limiter/`
- **tags:** infrastructure, security, billing
- **icon:** `fas fa-gauge-high`
- **hasNextLayer:** true

Sliding-window rate limiter + tenant-plan-based quota enforcement (seat/feature/usage limits).

## Dependencies

- **requires:** `redis`, `env`
- **optional:** `tenant_subscription`

## Services

- `limiter.service.ts`
- `limiter.tenant-plan.service.ts`

## Next layer (modules_next/) surface

- `limiter/limiter.rate-limiters` _(ui)_
- `limiter/limiter.service.next` _(service.next)_

## README

# limiter

Framework-agnostic rate limiting servisleri.

## Dosyalar

| Dosya | İçerik |
|-------|--------|
| `limiter.service.ts` | Redis INCR tabanlı IP rate limit (`check`) |
| `limiter.tenant-plan.service.ts` | Redis sorted set tabanlı tenant plan rate limit |

## Exports

- `check(ip, scope)` — IP bazlı rate limit kontrolü
- `LIMITS` — `{ auth: 20, api: 120 }`
- `RATE_LIMIT_WINDOW` — 60 saniye
- `LimiterScope` — `'auth' | 'api'`
- `checkTenantPlanRateLimit(tenantId, limitPerMinute)` — plan bazlı limit

Next.js'e özgü `Limiter` sınıfı (request parsing, 429 response) → `modules_next/limiter`.
