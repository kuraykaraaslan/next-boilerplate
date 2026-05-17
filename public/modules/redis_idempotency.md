# Idempotency Keys

- **id:** `redis_idempotency`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/redis_idempotency/`
- **tags:** infrastructure, reliability
- **icon:** `fas fa-key`
- **hasNextLayer:** true

Redis-backed idempotency-key store for safely retryable POST/PATCH operations.

## Dependencies

- **requires:** `redis`, `env`

## Services

- `redis_idempotency.service.ts`

## Next layer (modules_next/) surface

- `redis_idempotency/withIdempotency` _(ui)_

## README

# idempotency

Redis tabanlı idempotency key yönetimi.

## Exports

- `IdempotencyKey` — `get`, `setPending`, `setCompleted` static metodları
- `IdempotencyRecord` — `{ status, response? }` tipi
- `IdempotencyStatus` — `'pending' | 'completed'`

TTL: 24 saat.

Next.js `withIdempotency` middleware HOC → `modules_next/idempotency`.
