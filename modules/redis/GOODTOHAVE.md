# Good to Have — Redis

> All selected items shipped.

## Cluster & High Availability

### ✅ Sentinel / Managed Redis Failover
`redis.service.ts` reads `REDIS_SENTINELS` (comma-separated `host:port` list) and `REDIS_SENTINEL_NAME`. When set, the `ioredis` client is constructed with the Sentinel topology instead of a single URL, enabling automatic primary failover.

### Per-Region Redis URL
**Why:** Cross-region cache traffic when deployed in multiple countries.
**Complexity:** Medium — not yet implemented (use `REDIS_SENTINELS` per-region for now).

### Redis Cluster Mode Support
**Why:** Horizontal scale via Redis Cluster sharding.
**Complexity:** High — not yet implemented.

## Multi-Tenant Key Namespacing

### ✅ Per-Tenant Key Prefix Utility
`tenantKey(tenantId, ...segments)` in `redis.cache.ts` builds namespaced keys following the `tenant:<id>:<module>:<key>` convention. All tenant-scoped cache entries should use this helper.

### ✅ Tenant Cache Flush Helper
`clearTenantCache(tenantId)` in `redis.cache.ts` performs a `SCAN + UNLINK` sweep on the `tenant:<id>:*` pattern. Used by the tenant hard-purge cascade and GDPR erasure flow.

## Reliability & Observability

### ✅ Cross-Pod Single-Flight via Redis Lock
`singleFlightDistributed(key, loader, ttl)` in `redis.cache.ts` uses `SET NX EX` to ensure only one pod runs the loader at a time. Losers poll for the result; all paths include fail-open fallback to the loader when Redis is unavailable.

### ✅ BullMQ Connection Lifecycle Management
`redis.bullmq.ts` now maintains a single shared `Redis` connection (`_bullmqConnection`) reused across all `createQueue()` / `createWorker()` calls. `closeBullMQConnection()` enables graceful shutdown. Previous per-call `new Redis()` leak is fixed.

### Redis Metrics Exporter (Key Count, Memory, Hit Rate)
**Why:** Redis INFO metrics not exposed to Prometheus.
**Complexity:** Medium — not yet implemented.

## Cache Strategy

### ✅ Graceful Fail-Open ★ New Feature
`failOpen(operation, fallback)` in `redis.cache.ts` wraps any Redis call and returns the fallback value when Redis is unavailable, preventing a Redis outage from crashing the platform.

### Distributed Cache Tag Invalidation
**Why:** No mechanism to invalidate a group of related keys by tag.
**Complexity:** High — not yet implemented.

### Adaptive TTL Based on Access Frequency
**Why:** Fixed TTL spread regardless of access patterns.
**Complexity:** High — not yet implemented.
