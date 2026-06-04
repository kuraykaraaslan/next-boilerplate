# exchange_rate — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `exchange_rate.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `exchange_rate.service.ts` | 106 | Fetches the official TCMB USD/TRY selling rate, caches it in Redis (fresh + durable last-known-good), and exposes `getRate` / `convert` for USD↔TRY conversion at checkout. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Service throws raw `Error` instead of `AppError`** — All failure paths throw `new Error(...)`, so a route handler cannot derive an HTTP status or `ErrorCode` and every failure collapses to a generic 500. A cold-cache TCMB outage (`RATE_UNAVAILABLE`) should be a 503, and an unsupported pair (`UNSUPPORTED_PAIR`) should be a 400/422 — both are lost. Evidence: `modules/exchange_rate/exchange_rate.service.ts:65`, `:78`, `:84`, `:98`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"`; throw `new AppError(EXCHANGE_RATE_MESSAGES.RATE_UNAVAILABLE, 503, ErrorCode.INTERNAL_ERROR)` for the outage/parse paths and `new AppError(EXCHANGE_RATE_MESSAGES.UNSUPPORTED_PAIR, 400, ErrorCode.VALIDATION_ERROR)` for the bad pair.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Defined `ExchangeRateQuoteSchema` is never used; service returns a bare `number`** — `ExchangeRateQuoteSchema` exists in `exchange_rate.types.ts` but is never imported or used to shape output; `getRate`/`convert` return a bare `number` rather than a parsed quote object, so the value handed to the billing layer crosses no schema boundary. (Inputs themselves are fine: callers are internal services passing a plan's trusted `baseCurrency`, so the service correctly trusts typed input.) Evidence: `modules/exchange_rate/exchange_rate.service.ts:92`, `:102`; schema unused at `modules/exchange_rate/exchange_rate.types.ts:6`. Rule: `zod-validation.md`, `validation-philosophy.md`. Fix: either drop the unused schema or return a validated `ExchangeRateQuote` so the defined Safe* shape is actually exercised.
- **[Dimension 12 — Security hardening] `convert` does not bound `amount`** — The upstream URL is a hardcoded constant (no SSRF) and `singleFlight` collapses concurrent refetches, so upstream protection is already largely covered. The remaining gap: `convert` multiplies `amount` without checking it is finite and non-negative, so a non-finite or absurd `amount` propagates `NaN`/overflow silently into the billing amount. Evidence: `modules/exchange_rate/exchange_rate.service.ts:47` (fixed URL), `:104` (unguarded multiply). Rule: `security-hardening.md`. Fix: validate `amount` is finite and ≥ 0 before multiplying; existing singleFlight + last-known-good cache already cover upstream fan-out.

### 🔵 Low
- **[Dimension 4 — Messages] Operational log line embeds inline prose** — `Logger.warn` interpolates a hardcoded operational string (`"TCMB fetch failed, using stale USD/TRY rate ..."`). This is operator-facing, not user-facing, so it is not a real messages violation (all user-facing strings already come from `exchange_rate.messages.ts`); noted only for consistency. Evidence: `modules/exchange_rate/exchange_rate.service.ts:61`. Rule: `module-messages-pattern.md`. Fix: optionally move the static prefix into `exchange_rate.messages.ts`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static members, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Input is trusted internal/typed (OK); but `ExchangeRateQuoteSchema` defined and unused, output is a bare `number`. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` on every failure path (lines 65, 78, 84, 98); no `AppError`/status/`ErrorCode`. |
| 4 | Messages pattern | ✅ | User-facing strings sourced from `exchange_rate.messages.ts`; only an operational log prefix inline (Low). |
| 5 | DB access / entity ownership | — | No database access; service reads only TCMB (HTTP) + Redis. No entities by design. |
| 6 | Multi-tenancy | — | No tenant-scoped entities; FX rate is system-wide. DataSource not applicable. |
| 7 | Authorization / RBAC | — | No resource access; pure fetch/compute invoked by billing services. Authz enforced upstream. |
| 8 | Service composition / boundaries | ✅ | Depends only on `@/modules/redis` and `@/modules/logger` via the `@/` alias; no cross-imports/cycles. |
| 9 | Caching | ✅ | Fresh + durable keys, `singleFlight`, `jitter`-ed TTL, fail-open to last-known-good, Redis errors swallowed. |
| 10 | Secrets and config | ✅ | No `process.env` reads; upstream URL is a non-secret constant. |
| 11 | Logging and audit | ✅ | Failures logged fire-and-forget; no secrets in log lines (FX rate is public). No audit log needed for a read. |
| 12 | Security hardening | ⚠️ | Fixed upstream URL (no SSRF) and singleFlight throttling, but `amount` is unbounded in `convert`. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase `ExchangeRateService`; layout matches conventions. |

## Recommendations
1. Replace all `throw new Error(...)` with `AppError` carrying explicit `statusCode` + `ErrorCode` (503 for outage/parse, 400 for unsupported pair) so the billing route returns correct HTTP semantics. (High)
2. Guard `amount` (finite, ≥ 0) at the top of `convert`; remove or actually use `ExchangeRateQuoteSchema` so the defined schema is exercised rather than dead. (Medium)
3. Optionally hoist the static portion of the operational log string into `exchange_rate.messages.ts` for consistency. (Low)

## References
- Rules: `error-handling-and-app-error.md`, `zod-validation.md`, `validation-philosophy.md`, `caching-patterns.md`, `security-hardening.md`, `module-messages-pattern.md`, `code-structure-ts-master.md` · Source: `modules/exchange_rate/exchange_rate.service.ts`, `exchange_rate.messages.ts`, `exchange_rate.types.ts`
