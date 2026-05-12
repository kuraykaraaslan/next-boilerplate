# idempotency

Redis tabanlı idempotency key yönetimi.

## Exports

- `IdempotencyKey` — `get`, `setPending`, `setCompleted` static metodları
- `IdempotencyRecord` — `{ status, response? }` tipi
- `IdempotencyStatus` — `'pending' | 'completed'`

TTL: 24 saat.

Next.js `withIdempotency` middleware HOC → `modules_next/idempotency`.
