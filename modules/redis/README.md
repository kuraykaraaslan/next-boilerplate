# redis

Shared Redis client (ioredis) and BullMQ connection factory. One pooled client for application reads/writes, helpers for creating independent connections (Pub/Sub) and BullMQ queues.

## Public API

| Export | Source | Use |
|---|---|---|
| `redis` (default export) | [redis.service.ts](redis.service.ts) | The shared `ioredis` connection. Use for `get`/`set`/`incr`/etc. |
| `redisConnectionOptions` | [redis.service.ts](redis.service.ts) | Plain options object — useful when building a new `Redis` instance. |
| `createRedisConnection()` | [redis.service.ts](redis.service.ts) | New independent connection (required for Pub/Sub subscribers — they can't share the main client). |
| `getBullMQConnection()` | [redis.bullmq.ts](redis.bullmq.ts) | `ConnectionOptions` for BullMQ workers and queues. |
| `createQueue<T>(name)` | [redis.bullmq.ts](redis.bullmq.ts) | Convenience factory: `new Queue(name, { connection: getBullMQConnection() })`. |

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

## Connection options

Driven by `env.REDIS_HOST`, `env.REDIS_PORT`, `env.REDIS_PASSWORD`. `maxRetriesPerRequest: null` is set explicitly — it's required by BullMQ.

## Where Redis is used in this project

- Session cache ([modules/user_session](../user_session/))
- Idempotency keys ([modules/redis_idempotency](../redis_idempotency/))
- Rate limiting ([modules/limiter](../limiter/))
- Mail / push / sms queues (BullMQ — see notification modules)
- OAuth state, OTP, password-reset tokens (TTL keys)

## Rules

- No `next/*`, no `react`.
- **Don't** create one-off `new Redis(...)` instances scattered across modules — go through this module's helpers so connection options stay consistent.
- For Pub/Sub subscribers, always use `createRedisConnection()` — subscribed connections cannot serve other commands.
