# Rate Limiter

- **id:** `limiter`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/limiter/`
- **tags:** infrastructure, security, billing
- **icon:** `fas fa-gauge-high`
- **hasNextLayer:** false

Sliding-window rate limiter + tenant-plan-based quota enforcement (seat/feature/usage limits).

## Dependencies

- **requires:** `redis`, `env`
- **optional:** `tenant_subscription`

## README

# Limiter Module

Framework-agnostic Redis rate limiting. Provides global hardcoded IP/scope limits (`check`) plus a sliding-window helper whose per-call limit value is supplied by the caller, reused for tenant-plan and per-webhook quotas. The Next.js request/response glue (IP parsing, 429 responses) lives separately in `modules_next/limiter`.

---

## Files

| File | Description |
|---|---|
| `limiter.service.ts` | Redis `INCR`-based IP rate limit (`check`) with hardcoded per-scope ceilings. |
| `limiter.tenant-plan.service.ts` | Redis sorted-set sliding-window limiter; tenant-plan and per-webhook helpers. |
| `index.ts` | Public barrel — re-exports `check`, `LIMITS`, `RATE_LIMIT_WINDOW`, `LimiterScope`, `checkTenantPlanRateLimit`. |

No entities, DB tables, or settings — this module reads no per-tenant settings or data; limits are either compile-time constants or passed in by the caller.

---

## Services / Responsibilities

### `limiter.service.ts` — IP / scope limiter

A fixed-window counter keyed `rate_limit:{scope}:{ip}`. `redis.incr` increments the key; on the first hit it sets a `RATE_LIMIT_WINDOW`-second TTL. A request succeeds while the count is `<= LIMITS[scope]`.

| Export | Description |
|---|---|
| `check(ip, scope = 'api')` | Returns `{ success, remaining, limit }` for an IP within a scope. |
| `LIMITS` | `{ auth: 20, api: 120 }` — max requests per window, per scope. |
| `RATE_LIMIT_WINDOW` | `60` (seconds) — the fixed window length. |
| `LimiterScope` | `'auth' | 'api'` (the keys of `LIMITS`). |

### `limiter.tenant-plan.service.ts` — sliding-window limiter

A sliding-window limiter over an arbitrary Redis sorted-set key, using a `zremrangebyscore` / `zadd` / `zcard` / `expire` pipeline over a 1-minute (`WINDOW_MS = 60_000`) window. A `limitPerMinute` of `-1` means unlimited (short-circuits to success with infinite remaining). The shared algorithm is wrapped by two id-namespaced helpers.

| Export | Key | Description |
|---|---|---|
| `checkSlidingWindowRateLimit(key, limitPerMinute)` | caller-supplied | Base helper returning `RateLimitResult` (`{ success, remaining, limit }`). |
| `checkTenantPlanRateLimit(tenantId, limitPerMinute)` | `tenant:{tenantId}:ratelimit` | Per-tenant quota bucket — each tenant gets an isolated sorted set. |
| `checkWebhookRateLimit(webhookId, limitPerMinute)` | `webhook:{webhookId}:ratelimit` | Per-endpoint webhook delivery rate limit (deliveries/minute). |

Only `checkTenantPlanRateLimit` is re-exported from `index.ts`; `checkSlidingWindowRateLimit` and `checkWebhookRateLimit` are imported directly by their consumers (e.g. the webhook module).

> **Note:** `limitPerMinute` is always supplied by the caller. There is no in-module producer resolving it from a tenant's subscription plan or feature key — see *Tenant Variability* below.

---

## Next.js adapter (`modules_next/limiter`)

The HTTP-aware layer is intentionally kept out of this framework-agnostic module:

| Export | File | Description |
|---|---|---|
| `Limiter` (default class) | `limiter.service.next.ts` | `getIpFromRequest` (`x-forwarded-for` → `x-real-ip` → `'unknown'`), `check`, `checkRateLimit`/`useRateLimit` returning a `429` `NextResponse` (or `null` when allowed). |
| `apiRateLimiter(request)` | `limiter.rate-limiters.ts` | Convenience wrapper for the `'api'` scope. |
| `authRateLimiter(request)` | `limiter.rate-limiters.ts` | Convenience wrapper for the `'auth'` scope. |
| `tenantPlanRateLimiter(request, tenantId, limitPerMinute)` | `limiter.rate-limiters.ts` | Calls `checkTenantPlanRateLimit` and returns a `429` with `X-RateLimit-*` / `X-RateLimit-Scope: tenant-plan` headers, or `null`. |

`429` responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.

---

## Usage

```typescript
// Framework-agnostic IP limit (e.g. in a service):
import { check } from '@/modules/limiter';

const { success, remaining, limit } = await check(ip, 'auth');
if (!success) throw new Error('Too many requests');

// Tenant-plan quota — caller supplies the per-minute limit (-1 = unlimited):
import { checkTenantPlanRateLimit } from '@/modules/limiter';

const result = await checkTenantPlanRateLimit(tenantId, limitPerMinute);
```

```typescript
// In a Next.js route handler / middleware:
import { apiRateLimiter, tenantPlanRateLimiter } from '@/modules_next/limiter/limiter.rate-limiters';

const limited = await apiRateLimiter(request);
if (limited) return limited; // 429 NextResponse, else null
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A framework-agnostic Redis rate-limiter providing global hardcoded IP/scope limits plus a sliding-window helper whose per-call limit value is supplied by the caller; it namespaces tenant-plan and webhook limits by id but reads no per-tenant settings or data itself.

### Per-tenant behavior

- `limiter.tenant-plan.service.ts:checkTenantPlanRateLimit` — Counter keying is per real tenant — each tenant gets an isolated Redis sorted-set bucket `tenant:{tenantId}:ratelimit`, so quota consumption is tracked independently per tenant. The numeric limitPerMinute itself is passed in by the caller (not resolved inside the module), and -1 means unlimited.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Global hardcoded request-rate ceilings (auth: 20, api: 120 per 60s window) applied uniformly to every IP/tenant | `limiter.service.ts — LIMITS / RATE_LIMIT_WINDOW constants used by check()` | These are compile-time globals shared across all tenants; a multi-tenant SaaS typically lets a tenant's plan raise/lower its API throughput. There is no per-tenant override path today, so a higher-tier tenant cannot get a larger api budget. (Note: IP-scoped auth/api limits are partly abuse-protection infra, so a global floor is defensible, but the api ceiling in particular is a plausible plan-differentiated value.) | `apiRateLimitPerMinute` |
| limitPerMinute for checkTenantPlanRateLimit is taken from the caller and currently has no producer wiring it to the tenant's subscription plan | `limiter.tenant-plan.service.ts:checkTenantPlanRateLimit / modules_next/limiter/limiter.rate-limiters.ts:tenantPlanRateLimiter` | The module is explicitly described as 'tenant-plan-based quota enforcement' and optionally depends on tenant_subscription, but the limit value is an inbound parameter with no in-repo caller resolving it from a per-tenant plan/feature-key. The intended source is a per-tenant plan limit (e.g. a tenant_subscription feature-key or a tenant setting), which should drive limitPerMinute rather than a caller-chosen constant. | `tenantPlanRateLimitPerMinute` |

---

## Dependencies

- **Requires:** `redis`, `env`
- **Optional:** `tenant_subscription` (intended source of per-tenant plan limits; not yet wired)
