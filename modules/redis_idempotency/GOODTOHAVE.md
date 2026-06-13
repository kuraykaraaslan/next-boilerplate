# Good to Have — Idempotency Keys

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Per-Tenant Policy Controls

### ✅ Per-Tenant Configurable TTL
**Why:** The 24-hour replay window is hardcoded as a module constant; different tenants or subscription plans need different replay windows (e.g. high-frequency trading tenants may need 5 minutes; async-heavy enterprise tenants may need 72 hours).
**Complexity:** Low
**Multi-tenant relevance:** A platform offering differentiated reliability tiers must be able to configure the idempotency window per tenant or per plan without redeploying.
**Multi-country relevance:** Payment regulations in some countries (e.g. PSD2 in the EU) define specific retry windows for financial operations; a configurable TTL allows compliance with jurisdiction-specific rules.

### ✅ Per-Tenant Idempotency Key Quota
**Why:** There is no cap on how many active idempotency keys a single tenant can hold in Redis; a misconfigured or malicious tenant can flood the shared keyspace with millions of entries, consuming memory at the expense of other tenants.
**Complexity:** Medium
**Multi-tenant relevance:** Fair-use memory isolation requires capping the number of active idempotency records per tenant so one tenant cannot degrade the Redis instance for others.
**Multi-country relevance:** No direct country relevance, but multi-country platforms with varying tenant activity profiles benefit from quota enforcement to prevent regional traffic spikes from exhausting shared infrastructure.

## Response Handling

### Partial / Streaming Response Replay
**Why:** The current `setCompleted` stores the full response body as a JSON blob; streaming responses (Server-Sent Events, chunked transfers) cannot be replayed through this mechanism and are silently treated as non-idempotent.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants with large report-generation or bulk-export endpoints expect idempotent replay of expensive async operations, not just simple JSON responses.
**Multi-country relevance:** No direct country relevance, but streaming is increasingly common in AI-response scenarios which are cross-country by nature.

### Response Header Preservation
**Why:** `setCompleted` stores only `{ body, statusCode }`; response headers set by the handler (e.g. `Content-Type`, `ETag`, `X-Request-Id`, `Set-Cookie`) are lost on replay, causing subtly wrong behaviour for clients that depend on them.
**Complexity:** Low
**Multi-tenant relevance:** Tenant API integrators building SDK clients depend on consistent headers across a request and its idempotency replay; missing `Content-Type` on replay breaks automatic JSON parsing.
**Multi-country relevance:** Locale-specific response headers (`Content-Language`, `Accept-Ranges`) that are set per request must be preserved so clients in different countries receive a semantically complete replay.

### ✅ Conflict Response with Retry-After Backoff
**Why:** The `withIdempotency` middleware responds to a `pending` state with a fixed `Retry-After: 1` second; there is no exponential backoff hint or a configurable retry interval, causing clients to retry at a fixed cadence regardless of the operation's expected duration.
**Complexity:** Low
**Multi-tenant relevance:** Long-running operations for enterprise tenants (bulk imports, report generation) can take minutes; a 1-second `Retry-After` causes unnecessary polling traffic against the platform.
**Multi-country relevance:** Cross-region latency means long-running operations initiated from a geographically distant region are even more likely to arrive with a duplicate while the first is still in-flight; a realistic `Retry-After` reduces spurious retries.

## Observability & Debugging

### ✅ Idempotency Replay Audit Log Entry
**Why:** When a request is replayed from the idempotency cache, there is no audit log entry recording that a replay occurred, who triggered it, from which IP, and what the replayed status code was.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant administrators investigating unexpected duplicate-prevention behaviour need an audit trail showing which requests were served from cache vs. re-executed.
**Multi-country relevance:** Payment regulators in some jurisdictions (e.g. EU PSD2, India RBI) require an audit trail of idempotent payment replays; the current implementation produces no such record.

### ✅ Metrics: Hit Rate, Pending Collisions, Expiry Rate
**Why:** There are no Prometheus/OTEL metrics for idempotency cache hits, misses, pending collisions, and key expirations; the idempotency layer is completely invisible to the observability stack.
**Complexity:** Low
**Multi-tenant relevance:** A spike in `pending` collisions for a specific tenant signals a broken client that is submitting duplicate requests; without metrics, this is only discoverable through error log analysis.
**Multi-country relevance:** Regional retry storms (e.g. a payment gateway timeout in one country causing clients to re-submit) generate idempotency hits that can be detected and alerted on before they cascade into overload.

## Error Resilience

### ✅ Graceful Redis Degradation
**Why:** If Redis is unavailable, `RedisIdempotencyService.get/setPending/setCompleted` throw raw `ioredis` errors that propagate to the route handler and return a 500; the platform should fail open (skip idempotency) rather than make the endpoint unavailable.
**Complexity:** Medium
**Multi-tenant relevance:** A Redis outage currently makes every idempotency-protected endpoint return 500 for all tenants simultaneously; fail-open mode limits the blast radius to potential duplicate operations rather than full unavailability.
**Multi-country relevance:** Regional Redis instances may have isolated outages; a per-region fail-open policy allows a country-specific Redis failure to degrade gracefully without impacting other regions.

### ✅ Idempotency Key Length & Character Validation
**Why:** The `Idempotency-Key` header value is accepted as-is with no length cap or character validation; a client can supply a 10 MB header or inject CRLF sequences into the Redis key.
**Complexity:** Low
**Multi-tenant relevance:** A malformed key from one tenant's misconfigured client should not cause a Redis `WRONGTYPE` or command-injection error that surfaces as a 500 for other tenants sharing the same Redis.
**Multi-country relevance:** No direct country relevance, but input validation is a baseline security requirement in all jurisdictions that mandate application-level security controls (e.g. ISO 27001, SOC 2).

## Distributed Concurrency

### ✅ Cross-Pod Pending Lock via Redis SET NX
**Why:** The current middleware sets a key to `pending`, then reads it back to detect in-flight duplicates; under concurrent requests across multiple pods there is a race window where two pods simultaneously miss the `pending` state and both execute the handler.
**Complexity:** Medium
**Multi-tenant relevance:** Payment and order-creation endpoints are the primary consumers of idempotency; a race that allows duplicate execution can create double-charges or duplicate orders for any tenant.
**Multi-country relevance:** Multi-region deployments with pods in different countries increase the probability of concurrent duplicate submissions during network partition events; an atomic `SET NX` lock eliminates the race regardless of pod location.
