# Redis Module

Shared Redis client (ioredis) and BullMQ connection factory. One pooled client for application reads/writes, plus helpers for creating independent connections (Pub/Sub), BullMQ queues, and cache stampede protection. There are no entities, routes, or settings — this is a pure infrastructure module wired entirely from global `env.REDIS_*` variables.

---

## Public API

| Export | Source | Use |
|---|---|---|
| `redis` (default export) | [redis.service.ts](redis.service.ts) | The shared `ioredis` connection. Use for `get`/`set`/`incr`/etc. |
| `redisConnectionOptions` | [redis.service.ts](redis.service.ts) | Plain options object — useful when building a new `Redis` instance. |
| `createRedisConnection()` | [redis.service.ts](redis.service.ts) | New independent connection (required for Pub/Sub subscribers — they can't share the main client). |
| `getBullMQConnection()` | [redis.bullmq.ts](redis.bullmq.ts) | `ConnectionOptions` for BullMQ workers and queues. |
| `createQueue<T>(name)` | [redis.bullmq.ts](redis.bullmq.ts) | Convenience factory: `new Queue(name, { connection: getBullMQConnection() })`. |
| `jitter(ttl, factor?)` | [redis.cache.ts](redis.cache.ts) | Returns `ttl ± factor%` (default 10%). Apply to every `setex` TTL so co-written keys don't expire on the same second. |
| `singleFlight(key, loader)` | [redis.cache.ts](redis.cache.ts) | In-process dedup of concurrent loaders for the same key. Process-local — does not deduplicate across pods. |

The package root (`index.ts`) re-exports `default` (the client), `createRedisConnection`, `redisConnectionOptions`, `getBullMQConnection`, `jitter`, and `singleFlight`. `createQueue` is imported directly from `redis.bullmq.ts`.

---

## Usage

### Plain Redis

```ts
import redis from "@/modules/redis";

await redis.set(`session:${id}`, JSON.stringify(payload), "EX", 1800);
const raw = await redis.get(`session:${id}`);
```

### BullMQ queue

```ts
import { createQueue } from "@/modules/redis/redis.bullmq";

const mailQueue = createQueue<MailJob>("notification_mail");
await mailQueue.add("welcome", { userId, template: "welcome" });
```

### Pub/Sub subscriber

```ts
import { createRedisConnection } from "@/modules/redis";

const sub = createRedisConnection();
await sub.subscribe("tenant-events");
sub.on("message", (channel, msg) => { /* … */ });
```

### Cached read with stampede protection

```ts
import redis, { jitter, singleFlight } from "@/modules/redis";

async function getUserById(userId: string) {
  const cacheKey = `user:id:${userId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  return singleFlight(cacheKey, async () => {
    const row = await db.user.findUnique({ where: { id: userId } });
    if (row) await redis.setex(cacheKey, jitter(300), JSON.stringify(row));
    return row;
  });
}
```

`singleFlight` keeps an in-process `Map<key, Promise>` — when N concurrent callers miss on the same key, only one DB query runs and the rest await its result. It does **not** dedupe across separate Node processes; for cross-pod single-flight you'd need a Redis `SET NX` lock layered on top.

---

## Connection options

Driven by `env.REDIS_HOST` (default `localhost`), `env.REDIS_PORT` (default `6379`), and `env.REDIS_PASSWORD` (optional). `maxRetriesPerRequest: null` is set explicitly on both the client and the BullMQ connection — it's required by BullMQ.

The shared client coerces a missing password to `''`; `getBullMQConnection()` coerces it to `undefined`. Both helpers read the same env vars so connection settings stay consistent across the app.

---

## Where Redis is used in this project

- Session cache ([modules/user_session](../user_session/))
- Idempotency keys ([modules/redis_idempotency](../redis_idempotency/))
- Rate limiting ([modules/limiter](../limiter/))
- Mail / push / sms queues (BullMQ — see notification modules)
- OAuth state, OTP, password-reset tokens (TTL keys)

---

## Settings

None. This module has no per-module setting keys or settings fields — all configuration comes from global `env.REDIS_*` variables (see [modules/env](../env/)).

---

## Rules

- No `next/*`, no `react`.
- **Don't** create one-off `new Redis(...)` instances scattered across modules — go through this module's helpers so connection options stay consistent.
- For Pub/Sub subscribers, always use `createRedisConnection()` — subscribed connections cannot serve other commands.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — The redis module provides a shared global ioredis client, BullMQ connection/queue factories, and cache primitives (jitter, singleFlight) wired entirely from global env.REDIS_* variables, with no tenant awareness at all.

---

## Dependencies

Requires [`env`](../env/) for connection configuration. Uses `ioredis` and `bullmq`.
