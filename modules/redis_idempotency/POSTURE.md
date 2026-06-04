# redis_idempotency — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `redis_idempotency.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 0l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `redis_idempotency.service.ts` | 35 | `IdempotencyKey` static store over the shared `redis` client: `get` / `setPending` / `setCompleted` for idempotency records JSON-encoded under `idempotency:${key}` with a fixed 24h TTL. |

## Findings

### 🟠 High
- **[Dimension 12 — Security hardening] Idempotency key has no tenant namespace (cross-tenant cached-response leak).** The Redis key is `idempotency:${idempotencyKey}` derived solely from the client-supplied `Idempotency-Key` header, with no tenant prefix. In a multi-tenant system, a colliding or guessable key from tenant A can return tenant B's cached `completed` response (or block it with a `pending` 409) in the shared global keyspace. This is a real cross-tenant isolation surface in the cache namespace (it is not a TypeORM tenant-entity query, so it is scored High, not Critical). Evidence: `modules/redis_idempotency/redis_idempotency.service.ts:13-14` (raw header read with no tenant context at `modules_next/redis_idempotency/withIdempotency.ts:8`). Rule: `security-hardening.md`. Fix: namespace the key by tenant (e.g. `idempotency:${tenantId}:${idempotencyKey}`) by threading the resolved tenantId into the store methods.

### 🟡 Medium
- **[Dimension 9 — Caching] `JSON.parse` not fail-open on corrupt cache.** `get` does `JSON.parse(raw)` with no try/catch; a malformed/corrupt cached value throws and breaks the request path instead of treating the key as absent. Evidence: `redis_idempotency.service.ts:20`. Rule: `caching-patterns.md`. Fix: wrap parse in try/catch and return `null` (fail open) on parse failure.
- **[Dimension 3 — Error handling] Redis I/O errors propagate as raw infrastructure errors.** `redis.get` / `redis.set` rejections bubble up untyped; a route handler cannot derive an HTTP status from them, and there is no `AppError` wrapping. (Note: there is no raw `throw new Error` in the service; this is an unwrapped-infra-error deviation, not a raw-throw violation.) Evidence: `redis_idempotency.service.ts:18,25,33`. Rule: `error-handling-and-app-error.md`. Fix: wrap Redis failures in `AppError(message, 503, ErrorCode.X)` (or deliberately fail open for the idempotency layer).
- **[Dimension 1 — Static service class] Declared export name does not match the actual exported class.** The exported class is `IdempotencyKey` (also re-exported by the barrel), but `module.json` declares the export as `RedisIdempotencyService`. The static-method / single-export shape is otherwise fine. Evidence: `redis_idempotency.service.ts:12`, `module.json:11`. Rule: `code-structure-ts-master.md`. Fix: align the class name with the declared `*Service` export, or correct `module.json` and the barrel.
- **[Dimension 13 — Naming] Class name diverges from the `<Module>Service` PascalCase convention.** `IdempotencyKey` reads like an entity/value type rather than a service, and sits next to the `IdempotencyRecord` type, making it easy to misread. Evidence: `redis_idempotency.service.ts:12`. Rule: `naming-conventions.md`. Fix: rename to `RedisIdempotencyService` (or `IdempotencyService`) to match the `.service.ts` suffix and `module.json`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | Static-only, single export — but class name `IdempotencyKey` ≠ declared `RedisIdempotencyService` in `module.json`. |
| 2 | Boundary validation | — | No external input enters the service; key is an internal string. No DB output to wrap in a Safe*Schema. |
| 3 | Error handling | ⚠️ | No raw `throw new Error`, but Redis/JSON errors propagate untyped; no `AppError`. |
| 4 | Messages pattern | ✅ | No user-facing strings in the service; prose lives in the middleware. |
| 5 | DB access / entity ownership | — | No DB or TypeORM; pure Redis infrastructure, no entities. |
| 6 | Multi-tenancy | ⚠️ | No DataSource (Redis only); but key lacks a tenant namespace (see Dim 12). |
| 7 | Authorization / RBAC | — | Infrastructure store; authz enforced at route/middleware layer. |
| 8 | Service composition / boundaries | ✅ | Depends only on `@/modules/redis` via the barrel; no cross-imports or cycles. |
| 9 | Caching | ⚠️ | `JSON.parse` not fail-open; corrupt cache throws instead of treating key as absent. |
| 10 | Secrets and config | ✅ | No `process.env.X` read in the service; secrets/config not handled here. |
| 11 | Logging and audit | — | Low-level cache store; per-key audit logging not expected. |
| 12 | Security hardening | ❌ | Idempotency key has no tenant namespace → cross-tenant cached-response leak / collision. |
| 13 | Naming and file organization | ⚠️ | File/module naming OK; class name diverges from `<Module>Service` convention. |

## Recommendations
1. **Namespace idempotency keys by tenant** (`idempotency:${tenantId}:${key}`) — thread the resolved tenantId from the request into `get`/`setPending`/`setCompleted` to close the cross-tenant collision/leak surface.
2. **Make `get` fail open** — wrap `JSON.parse` in try/catch and return `null` on corrupt data so a poisoned cache entry cannot break the request path.
3. **Decide and document the error contract** — either fail open on Redis errors (catch and proceed without idempotency) or wrap them in `AppError` with an explicit status; do not let raw infra errors bubble untyped.
4. **Reconcile the class name** — rename `IdempotencyKey` to `RedisIdempotencyService` (or fix `module.json` and the barrel) so the declared export, class name, and `.service.ts` suffix agree.

## References
- Rules: `security-hardening.md`, `caching-patterns.md`, `error-handling-and-app-error.md`, `code-structure-ts-master.md`, `naming-conventions.md` · Source: `modules/redis_idempotency/redis_idempotency.service.ts` (context: `modules_next/redis_idempotency/withIdempotency.ts`)
</content>
</invoke>
