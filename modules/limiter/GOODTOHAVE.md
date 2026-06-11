# Good to Have — Rate Limiter

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Plan-Driven Quota Wiring

### Automatic Plan-Limit Resolution
**Why:** `checkTenantPlanRateLimit` receives `limitPerMinute` as a caller-supplied argument, but no in-repo code path resolves that value from the tenant's actual subscription plan feature key — callers must hard-code a number or write their own resolver, which defeats the purpose of plan-based enforcement.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant's plan defines their API throughput allowance; the limiter should pull that value from `tenant_subscription` automatically so upgrading a plan takes effect immediately without code changes.
**Multi-country relevance:** Country-specific plans (e.g. a restricted tier for markets under API quota regulations) can specify different `limitPerMinute` values that the resolver would surface automatically.

### Per-Tenant API Scope Override
**Why:** The global `LIMITS` constants (`auth: 20, api: 120`) apply identically to every tenant and every IP. Higher-tier tenants cannot receive a larger API budget, which limits plan differentiation.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants routinely expect a meaningfully higher throughput ceiling than free-tier users; today both hit the same `api: 120` wall.
**Multi-country relevance:** Complying with country-specific fair-use policies may require tightening limits for certain markets (e.g. lower limits for regions with metered connectivity agreements) without changing the global constant.

---

## Geo-Based Rate Limiting

### Country-Level Request Throttling
**Why:** High-risk or legally constrained geographies (e.g. OFAC-sanctioned countries, regions with strict data-sovereignty laws) may need hard request ceilings separate from per-IP or per-tenant limits.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant operating in a regulated market could enable stricter country-level caps on their namespace to stay compliant without platform-wide changes.
**Multi-country relevance:** Core multi-country concern — allows the platform to enforce distinct throughput rules per country or region, and respond with legally required rate-limit error bodies (some jurisdictions require specific error language).

### Geo-Based Scope Differentiation
**Why:** Countries with higher fraud rates or abuse history may warrant tighter `auth` scope limits than low-risk geographies. Today the `LIMITS.auth: 20` value is applied globally.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant configured for a high-risk market benefits from automatic tightening without the platform operator having to touch per-tenant settings.
**Multi-country relevance:** Direct — allows per-country `auth` ceilings driven by risk profiles rather than a single global constant.

---

## Observability & Transparency

### Rate-Limit Hit Counter in Prometheus / Observability
**Why:** Today, limit breaches are logged as `Logger.warn` lines only. There is no Prometheus counter or ObservabilityService call, so Grafana dashboards cannot show rate-limit hit rates, identify abusive tenants, or alert on sustained abuse.
**Complexity:** Low
**Multi-tenant relevance:** A per-tenant hit counter label lets operators see which tenant is consistently throttled and whether a plan upgrade is warranted.
**Multi-country relevance:** A per-country dimension on the counter enables geo-based abuse detection without trawling log files.

### `Retry-After` Propagation for Sliding-Window Limiter
**Why:** The sliding-window `checkSlidingWindowRateLimit` returns `{ success, remaining, limit }` but does not return a `retryAfterMs` value. The HTTP adapter's `429` response therefore cannot set an accurate `Retry-After` header for tenant-plan limits, only for the fixed-window IP limiter.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants integrating the API programmatically depend on `Retry-After` to implement correct back-off; absent it they must guess or poll.
**Multi-country relevance:** Some jurisdictions (e.g. EU consumer protection rules around API fairness) encourage or require informative rate-limit response headers.

---

## Resilience & Fail-Behaviour Policy

### Configurable Fail-Open vs. Fail-Closed Policy
**Why:** Both services currently fail-open (return `{ success: true }`) on Redis errors. This is documented but not configurable — some tenants or scopes (e.g. `auth`) may prefer fail-closed (`429`) because an unenforced auth scope is a security risk.
**Complexity:** Low
**Multi-tenant relevance:** Security-sensitive tenants (e.g. financial-services customers) may contractually require fail-closed behavior on the auth scope; a single global fail-open policy cannot satisfy both audiences.
**Multi-country relevance:** Certain regulated markets (banking, healthcare) require that rate-limit controls never silently degrade; a configurable fail mode lets operators meet local compliance requirements.

### Distributed Redis Cluster Support (Lua-Script Atomicity)
**Why:** The fixed-window limiter uses `INCR` + `EXPIRE` as two non-atomic commands. Under a Redis Cluster or a Sentinel failover, a race between the two commands can reset the TTL incorrectly, causing windows to drift.
**Complexity:** Medium
**Multi-tenant relevance:** A large multi-tenant platform typically runs Redis in cluster mode; the current two-command pattern is not safe at scale under sharding.
**Multi-country relevance:** Multi-region deployments (e.g. EU + US clusters) require atomic counter operations that tolerate Redis topology changes without double-counting or counter resets.

---

## Quota & Billing Integration

### Usage Quota Persistence (Soft-Cap Audit Trail)
**Why:** The sliding-window limiter counts requests in Redis only. If a tenant approaches their monthly API quota ceiling, there is no durable record — Redis expiry silently resets counters, making billing reconciliation impossible.
**Complexity:** High
**Multi-tenant relevance:** SaaS billing requires a durable, auditable record of API usage per tenant per billing period; an in-memory-only counter cannot serve as source of truth.
**Multi-country relevance:** Tax authorities in several countries (e.g. Germany, France under Loi de Finance digitale) require traceable billing data; ephemerally-counted usage cannot satisfy this requirement.

### Soft-Cap Warning Notifications
**Why:** When a tenant reaches 80% or 100% of their plan quota, there is no notification pathway — they simply hit a `429` with no prior warning, which damages the integration experience.
**Complexity:** Medium
**Multi-tenant relevance:** Proactive quota warnings let tenants self-serve a plan upgrade before they are blocked, reducing support tickets and churn.
**Multi-country relevance:** Consumer-protection regulations in some markets (notably the EU Digital Markets Act context and UK CMA guidelines) encourage transparent advance notification of service limitations.
