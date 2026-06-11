# Good to Have — Redis

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Cluster & High Availability

### Redis Cluster Mode Support
**Why:** The current client is a single-node `ioredis` instance driven by one `REDIS_URL`; Redis Cluster (sharded across multiple nodes) is required for horizontal scale and automatic failover in production.
**Complexity:** High
**Multi-tenant relevance:** Under high load, a single Redis node becomes a bottleneck shared by all tenants; clustering distributes the keyspace so one tenant's cache storm does not degrade others.
**Multi-country relevance:** Multi-region deployments need a Redis topology per region (e.g. Elasticache cluster in `eu-west-1`, separate cluster in `ap-southeast-1`) to keep cache reads local; a single global URL cannot express this.

### Sentinel / Managed Redis Failover
**Why:** If the single Redis node goes down, the entire platform loses session cache, rate limiting, idempotency keys, and BullMQ queues simultaneously; there is no Sentinel or replica failover configuration.
**Complexity:** High
**Multi-tenant relevance:** A Redis outage degrades all tenants at once; Sentinel provides automatic failover so the impact is seconds rather than minutes of downtime during node replacement.
**Multi-country relevance:** Regional cloud providers (AWS ElastiCache, Azure Cache for Redis, GCP Memorystore) expose managed Redis with automatic failover that the client must be configured to use via the cluster or Sentinel API.

### Per-Region Redis URL
**Why:** `REDIS_URL` is a single global string; there is no mechanism to route connections to a region-local Redis when the platform is deployed in multiple countries, forcing cross-region cache traffic.
**Complexity:** Medium
**Multi-tenant relevance:** Cache hit rates drop and latency increases when a pod in `eu-west-1` reads from a Redis in `us-east-1`; per-region routing keeps cache operations fast for all tenants in that region.
**Multi-country relevance:** Data sovereignty regulations in some countries (e.g. China, Russia) prohibit cached session data from leaving the country; per-region Redis URLs are the mechanism to enforce this at the infrastructure level.

## Multi-Tenant Key Namespacing

### Per-Tenant Key Prefix Utility
**Why:** All modules (session, rate limiting, OTP, OAuth state, etc.) write keys into a flat global Redis keyspace with no enforced tenant prefix convention; cross-tenant key collisions or inspection are possible.
**Complexity:** Low
**Multi-tenant relevance:** A shared utility `tenantKey(tenantId, ...segments)` → `tenant:<id>:<module>:<key>` ensures every tenant's data is isolated in the keyspace and can be flushed atomically using `SCAN` + `DEL` on `tenant:<id>:*`.
**Multi-country relevance:** Regional data-erasure requirements (GDPR right to be forgotten at the cache layer) are only practical if all cached data for a tenant or user is namespace-addressable.

### Tenant Cache Flush Helper
**Why:** There is no `clearTenantCache(tenantId)` utility to evict all Redis keys belonging to a tenant when the tenant is suspended, deleted, or their data is exported for erasure.
**Complexity:** Medium
**Multi-tenant relevance:** Tenant off-boarding requires removing cached sessions, rate-limit counters, OTP tokens, and idempotency records; without a flush helper each module must implement its own deletion sweep.
**Multi-country relevance:** GDPR and KVKK data erasure obligations extend to cache layers; a flush helper is needed to fulfil right-to-erasure requests reliably.

## Reliability & Observability

### Cross-Pod Single-Flight via Redis Lock
**Why:** The current `singleFlight` uses an in-process `Map` and explicitly does not deduplicate across pods; under a multi-pod deployment, N pods can simultaneously execute the same expensive DB query on a cold cache.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants with large datasets can trigger thundering-herd cache refills across dozens of pods simultaneously; a Redis-backed `SET NX` lock limits the DB query to one winner per cluster.
**Multi-country relevance:** No direct country relevance, but multi-region deployments multiply the pod count; the risk scales with geographic distribution.

### Redis Metrics Exporter (Key Count, Memory, Hit Rate)
**Why:** There is no instrumentation that exposes Redis `INFO` metrics (memory usage, hit/miss ratio, connected clients, eviction count) to the Prometheus scrape endpoint, leaving the cache layer invisible to the observability stack.
**Complexity:** Medium
**Multi-tenant relevance:** A per-tenant key-count metric would reveal which tenant is filling the cache disproportionately and consuming shared memory at the expense of other tenants.
**Multi-country relevance:** Regional Redis instances have independent memory budgets; per-region metrics are needed to trigger scaling decisions before an instance hits its memory limit.

### BullMQ Connection Lifecycle Management
**Why:** `getBullMQConnection()` creates a `new Redis()` on every call with no reuse, caching, or lifecycle tracking; each `createQueue()` call leaks a connection handle that is never destroyed.
**Complexity:** Medium
**Multi-tenant relevance:** A platform with many BullMQ queues (mail, SMS, webhook, AI, push) multiplied by the call frequency will exhaust the Redis `max_clients` limit, degrading all tenant job processing.
**Multi-country relevance:** No direct country relevance, but resource leaks compound in long-running multi-region deployments where queues are created and recreated across restarts.

## Cache Strategy

### Distributed Cache Tag Invalidation
**Why:** There is no mechanism to invalidate a group of related cache keys by tag (e.g. `invalidate('tenant:abc:store:*')`) when a tenant updates their product catalog or settings; individual key deletion must be done by every service.
**Complexity:** High
**Multi-tenant relevance:** A tenant updating a pricing rule should invalidate all cart-price and product-list caches for that tenant atomically; the current primitives require each service to track and delete its own keys.
**Multi-country relevance:** No direct country relevance, but tag invalidation is the foundation for per-country product/pricing cache segments that can be flushed independently when country-specific pricing changes.

### Adaptive TTL Based on Access Frequency
**Why:** The `jitter` helper applies a fixed ±10% TTL spread; there is no mechanism to extend the TTL of a frequently accessed key (hot content) or shrink it for rarely accessed data, leading to suboptimal memory use.
**Complexity:** High
**Multi-tenant relevance:** A high-traffic tenant's hot product page can be served from cache far longer than the fixed TTL; conversely, a low-traffic tenant's stale data consumes memory longer than needed.
**Multi-country relevance:** Seasonal traffic spikes (e.g. national holidays) in a specific country temporarily make regional content "hot"; adaptive TTL would extend those entries automatically without manual tuning.
