# Idempotency Keys

- **id:** `redis_idempotency`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/redis_idempotency/`
- **tags:** infrastructure, reliability
- **icon:** `fas fa-key`
- **hasNextLayer:** false

Redis-backed idempotency-key store for safely retryable POST/PATCH operations.

## Dependencies

- **requires:** `redis`, `env`

## Services

- `redis_idempotency.service.ts`

## README

# Redis Idempotency Module

Redis-backed idempotency-key store for safely retryable POST/PATCH operations. A client sends an `Idempotency-Key` header; the first request runs, and any replay of the same key returns the cached response instead of re-executing the handler. Pure shared infrastructure — no entities, no settings, no tenant-aware logic.

---

## Service

`IdempotencyKey` (`redis_idempotency.service.ts`) — static-method store over the shared `redis` client. Records are JSON-encoded under the Redis key `idempotency:${idempotencyKey}` with a fixed `TTL_SECONDS = 86400` (24 hours).

| Method | Description |
|---|---|
| `get(idempotencyKey)` | Returns the stored `IdempotencyRecord`, or `null` if the key is unknown/expired. |
| `setPending(idempotencyKey)` | Marks a key as in-flight (`status: 'pending'`) with the 24h TTL. |
| `setCompleted(idempotencyKey, { body, statusCode })` | Stores the final response (`status: 'completed'`) with the 24h TTL, so replays return it. |

### Exported types

- `IdempotencyStatus` — `'pending' | 'completed'`
- `IdempotencyRecord` — `{ status: IdempotencyStatus; response?: { body: unknown; statusCode: number } }`

All three are re-exported from the module barrel (`index.ts`).

---

## Middleware

The Next.js HOC `withIdempotency` (`modules_next/redis_idempotency/withIdempotency.ts`) wraps a route handler and drives the store:

1. No `Idempotency-Key` header → run the handler unchanged (idempotency is opt-in).
2. Existing record is `pending` → respond `409` `{ error: 'Request is already being processed' }` with `Retry-After: 1`.
3. Existing record is `completed` → replay the cached body and status code with header `Idempotency-Replayed: true`.
4. Otherwise → `setPending`, run the handler, then `setCompleted` with the response body and status, and return the response.

```typescript
import { withIdempotency } from '@/modules_next/redis_idempotency/withIdempotency';

export const POST = withIdempotency(async (request) => {
  // ... handler runs at most once per Idempotency-Key within 24h
  return NextResponse.json({ ok: true }, { status: 201 });
});
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A Redis-backed idempotency-key store (get/setPending/setCompleted with a fixed 24h TTL) for safely retryable POST/PATCH requests; it is pure shared infrastructure with no tenant settings, entities, or tenant-aware logic.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Idempotency record TTL is hardcoded global constant TTL_SECONDS = 86400 (24h); every tenant gets the exact same replay window with no override. | `redis_idempotency.service.ts:TTL_SECONDS (used in IdempotencyKey.setPending / setCompleted)` | The safe-retry replay window is a reliability/policy knob that some tenants may want shorter or longer (e.g. high-volume tenants vs. tenants with long-running async ops). Today it is a single module-level constant, identical for all tenants. Could be made a per-tenant (or at least per-tenant-plan) setting; note it is currently intentionally global infra. | `idempotencyTtlSeconds` |
| Redis key namespace is a flat global string `idempotency:${idempotencyKey}`, derived solely from the client-supplied `Idempotency-Key` header with no tenant prefix, so two tenants sending the same key collide in one shared Redis keyspace. | `redis_idempotency.service.ts:IdempotencyKey.key (and withIdempotency.ts reads the raw `Idempotency-Key` header)` | In a multi-tenant system, a colliding/guessable idempotency key from tenant A can return tenant B's cached completed response (or block it with a 409 pending), a cross-tenant collision / cached-response-leak surface. The key should be namespaced by the request's tenantId rather than per-tenant configurable, so this is a tenant-isolation defect more than a setting, but it is where per-tenant scoping is missing. | — |

---

## Dependencies

- `redis` — the shared Redis client used to store and read idempotency records.
- `env` — environment configuration.
