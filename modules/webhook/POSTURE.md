# webhook — Posture Review

> **Uygulandı:** 2026-06-10 — High AppError (webhook.service.ts 4 site + webhook.crud.service.ts 4 site), High DEAD_LETTERED enum.ts'e eklendi, Medium inline test mesajı webhook.messages.ts'e taşındı.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** webhook.service.ts, webhook.crud.service.ts, webhook.delivery.service.ts, webhook.metrics.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| webhook.service.ts | 267 | Public facade: dispatch, redeliver/replay, test/trigger delivery, secret/sign helpers; delegates CRUD, delivery and metrics to collaborators. |
| webhook.crud.service.ts | 135 | Endpoint CRUD + signing-secret rotation; SSRF pre-check on create/update. |
| webhook.delivery.service.ts | 172 | HTTP delivery engine: signed POST, retry/dead-letter scheduling, per-endpoint circuit breaker. |
| webhook.metrics.service.ts | 83 | Read-side: paginated delivery listing + aggregate metrics (Postgres `PERCENTILE_CONT`/`FILTER`). |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Services throw raw `Error` instead of `AppError`** — Not-found paths throw `new Error(WebhookMessages.X)`, so a route handler cannot derive an HTTP status (defaults to 500 for a should-be-404). Evidence: `modules/webhook/webhook.service.ts:125`, `:128`, `:187`, `:249`; `modules/webhook/webhook.crud.service.ts:33`, `:69`, `:102`, `:122`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(WebhookMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND)` (and `DELIVERY_NOT_FOUND` likewise) using `@/modules/common/app-error`.
- **[Dimension 2 — Boundary validation] Output schema rejects a valid persisted status (`DEAD_LETTERED`)** — `WebhookDeliveryStatusEnum` only allows `['PENDING','SUCCESS','FAILED']` (`webhook.enums.ts:66`), and `WebhookDeliverySchema.status` reuses it (`webhook.types.ts:43`), but the delivery engine persists `status = 'DEAD_LETTERED'` (`webhook.delivery.service.ts:116`). Every delivery row is parsed through `WebhookDeliverySchema` on read, so `listDeliveries`/`sendTest` throws a ZodError as soon as a dead-lettered row is in range. Evidence: `modules/webhook/webhook.metrics.service.ts:23` (parse) and `modules/webhook/webhook.service.ts:231` (parse) vs `modules/webhook/webhook.delivery.service.ts:116` (persist). Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: add `'DEAD_LETTERED'` to `WebhookDeliveryStatusEnum` (the `WebhookMetrics` doc comment and metrics `byStatus`/`terminal` already treat it as a real status).

### 🟡 Medium
- **[Dimension 7 — Authorization / RBAC] No resource-level authz inside the services** — All mutating ops (`update`, `delete`, `rotateSecret`, `redeliver`, `sendTest`, `triggerEvent`) trust the `tenantId` argument and do no ownership/role check in-service. Per the grounding facts this is a documented deviation, not a leak — every tenant-scoped query is correctly `tenantId`-filtered. Evidence: `modules/webhook/webhook.crud.service.ts:64`, `:98`, `:113`; `modules/webhook/webhook.service.ts:119`, `:184`, `:241`. Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Fix: keep route-layer enforcement, or add an explicit membership/role assertion in the facade.
- **[Dimension 4 — Messages pattern] Hardcoded user-facing string in the service** — `sendTest` inlines the prose test message `'This is a test delivery from the webhook system.'` directly in the service envelope. Evidence: `modules/webhook/webhook.service.ts:194`. Rule: `module-messages-pattern.md`. Fix: move the test-message prose to `webhook.messages.ts`.
- **[Dimension 5 — DB access / transactions] Multi-write delivery update not transactional** — `WebhookDeliveryService.execute` saves the delivery row and then runs `applyCircuitBreaker` (a separate `findOne`+`save` on the webhook) as two independent writes; a crash between them leaves the breaker counter inconsistent. Evidence: `modules/webhook/webhook.delivery.service.ts:124`, `:128`, `:167`. Rule: `database-patterns.md`. Fix: wrap the delivery-record update and breaker update in a single `ds.transaction(...)`, or document the eventual-consistency intent.
- **[Dimension 11 — Logging / audit] No audit-log entries for sensitive admin actions** — Secret rotation, endpoint create/update/delete, manual redeliver and replay produce only `Logger.info/warn`, not fire-and-forget audit rows. `rotateSecret` (a credential-changing action) is the most notable gap. Evidence: `modules/webhook/webhook.crud.service.ts:130` (Logger only on rotate), `:98`-`:103` (delete); `modules/webhook/webhook.service.ts:119`-`:160` (redeliver). Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit `AuditLogService` events (no secret material in the line) for rotate/create/update/delete/redeliver.

### 🔵 Low
- **[Dimension 13 — Naming] Stale doc reference to a non-existent symbol** — A JSDoc comment references `WebhookService._executeDelivery`, which no longer exists (the delivery path is now `WebhookDeliveryService.execute`). Evidence: `modules/webhook/webhook.dto.ts:8`. Rule: `naming-conventions.md`. Fix: update the comment to point at `WebhookDeliveryService.execute`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All four are static-only classes with a single default export; facade holds a `QUEUE` handle. |
| 2 | Boundary validation | ❌ | Reads filtered through `WebhookDeliverySchema`/`SafeWebhookSchema`, but the status enum is missing `DEAD_LETTERED` → parse throws on real rows. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` on every not-found path; never `AppError`. |
| 4 | Messages pattern | ⚠️ | Uses `webhook.messages.ts`, but `sendTest` inlines a prose test message. |
| 5 | DB access / entity ownership | ⚠️ | DB only in services, entities under `entities/`, null-checked, parameterized QB; multi-write delivery+breaker not in a transaction. |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId` (incl. metrics QB and circuit breaker). |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership/role check; authz enforced at route layer (deviation from authorization-and-rbac.md). Feature gating present via `hasWebhookFeature`. |
| 8 | Service composition | ✅ | Facade hides delivery/metrics/crud collaborators; cross-module imports use `@/` alias and facades. |
| 9 | Caching | — | Optional; tuning reads via `SettingService`, dispatch read is per-event and acceptable. N/A. |
| 10 | Secrets / config | ✅ | No `process.env` in services; tuning via `SettingService`, signing via the `@/modules/env`-backed crypto module. |
| 11 | Logging / audit | ⚠️ | Good fire-and-forget logging, but sensitive admin actions (rotate/create/delete/redeliver) emit no audit-log rows. |
| 12 | Security hardening | ✅ | SSRF check at create + delivery (DNS-rebinding aware), `redirect:'manual'`, timeout, reserved-header stripping, HMAC signing, per-endpoint rate limit, circuit breaker. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab-case files, PascalCase classes, correct suffixes; one stale doc reference. |

## Recommendations
1. Replace every `throw new Error(WebhookMessages.X)` with `AppError` carrying `404 / NOT_FOUND` so routes return correct status codes (Dimension 3, High).
2. Add `'DEAD_LETTERED'` to `WebhookDeliveryStatusEnum` so persisted rows survive `WebhookDeliverySchema.parse()` in `listDeliveries`/`sendTest` (Dimension 2, High).
3. Emit fire-and-forget audit-log events for secret rotation and endpoint create/update/delete/redeliver, with no secret material in the line (Dimension 11).
4. Move the `sendTest` prose message into `webhook.messages.ts` (Dimension 4).
5. Wrap the delivery-record update + circuit-breaker update in a single transaction, or document the intentional eventual consistency (Dimension 5).
6. Fix the stale `_executeDelivery` doc reference in `webhook.dto.ts` (Dimension 13).

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `zod-validation.md`, `module-messages-pattern.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `naming-conventions.md` · Source: `modules/webhook/webhook.service.ts`, `webhook.crud.service.ts`, `webhook.delivery.service.ts`, `webhook.metrics.service.ts`
