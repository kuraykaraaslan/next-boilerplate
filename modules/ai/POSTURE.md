# ai — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `ai.service.ts`
> **Overall grade:** C · **Findings:** 0c / 2h / 2m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `ai.service.ts` | 526 | Tenant-aware AI facade: resolves per-tenant provider bundles (OpenAI / Anthropic / Google) from Settings+env, gates usage on subscription features, performs chat / chatStream / embed, tracks usage in Redis + `tenant_usage`, and persists per-call `AiUsageLog` rows. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Throws custom `AIError` without a usable statusCode instead of `AppError`** — `chat`, `chatStream`, and `embed` throw `new AIError("Provider X is not configured", provider, "NOT_CONFIGURED")`. `AIError` extends `Error` (defined in `ai.types.ts:121`) and the `statusCode` constructor arg is omitted here, so it resolves to `undefined`. A route handler cannot derive an HTTP status from this throw — the same functional defect as a raw `Error`. Evidence: `modules/ai/ai.service.ts:243`, `:277`, `:308`. Rule: `error-handling-and-app-error.md`. Fix: throw `new AppError("...", 503, ErrorCode.FEATURE_NOT_AVAILABLE)` (or 409/422 as appropriate) from `@/modules/common/app-error`, or always pass an explicit `statusCode` to `AIError`.
- **[Dimension 4 — Messages pattern] No `ai.messages.ts`; user-facing strings hardcoded inline** — the module has no messages source file, and the not-configured error message is composed inline in the service. Evidence: `modules/ai/ai.service.ts:244` (`` `Provider ${provider.providerType} is not configured` ``), repeated at `:278` and `:309`. Rule: `module-messages-pattern.md`. Fix: add `modules/ai/ai.messages.ts` and reference a keyed message instead of the inline literal.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Provider responses returned without a `Safe*Schema` filter** — `chat`/`chatStream`/`embed` return the raw provider `ChatCompletionResponse` / `EmbeddingResponse` straight to callers; there is no output schema gate before returning DB/provider-derived data. Evidence: `modules/ai/ai.service.ts:256`, `:289`, `:320`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: define and apply a `SafeChatCompletionResponseSchema` / `SafeEmbeddingResponseSchema` (or document that provider DTOs are trusted) before returning.
- **[Dimension 11 — Logging / audit] Meaningful AI usage persisted but no audit-log entry** — per-call usage is written to `AiUsageLog` best-effort (good for billing) but there is no fire-and-forget audit-trail entry for the AI action itself, and failures are only `Logger.warn`-ed. Evidence: `modules/ai/ai.service.ts:348-372`, `:377-400`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log event for chat/embed invocations alongside the usage row.

### 🔵 Low
- **[Dimension 1 — Static service class] Mutable module-level state via static provider cache** — `_tenantProviders` is a long-lived `Map` mutated by `getTenantBundle`, `reinitializeProvider`, and `invalidateTenant`. It grows unbounded with the number of tenants (no eviction) and holds API-key-bearing provider instances in process memory. Evidence: `modules/ai/ai.service.ts:51`, `:97-104`, `:524`. Rule: `code-structure-ts-master.md`. Fix: bound the cache (LRU / TTL) or rely on the existing `invalidateTenant` hook from Settings writes; acceptable for boilerplate but note the growth.
- **[Dimension 9 — Caching] `getUsage` issues up to `days` sequential Redis round-trips** — the read loop calls `redis.get` once per day (default 30) serially with no pipelining/MGET. Evidence: `modules/ai/ai.service.ts:412-424`. Rule: `caching-patterns.md`. Fix: batch with a single `MGET` over the computed keys. (Errors already fail open to `0`, which is correct.)

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | Single default export, all-static, never instantiated; but mutable static provider-cache Map grows unbounded. |
| 2 | Boundary validation | ⚠️ | Typed inputs trusted; provider/DB outputs returned without a Safe*Schema gate. |
| 3 | Error handling | ❌ | Throws `AIError` with no `statusCode` for NOT_CONFIGURED; route cannot derive HTTP status (AppError not used). |
| 4 | Messages pattern | ❌ | No `ai.messages.ts`; not-configured message hardcoded inline at three sites. |
| 5 | DB access & entity ownership | ✅ | DB touched only in service; `AiUsageLog` under `entities/`; `repo.create`+`save`, no raw SQL; single-row writes (no multi-write tx needed). |
| 6 | Multi-tenancy | ✅ | Uses `tenantDataSourceFor(tenantId)`; every `AiUsageLog` row carries `tenantId`; Redis keys namespaced per tenant. No missing tenant filter. |
| 7 | Authorization / RBAC | ⚠️ | In-service subscription/feature gate present (`assertAiFeatureAccess`, root short-circuit); resource-level/membership authz enforced at route layer (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Providers hidden behind the facade; cross-module imports (`setting`, `tenant_usage`, `tenant_subscription`, `env`, `db`) use `@/` alias; no sub-service cross-imports/cycles. |
| 9 | Caching | ⚠️ | Usage tracking fails open correctly; `getUsage` does N sequential Redis GETs on a read path (no MGET). |
| 10 | Secrets & config | ✅ | All config/keys via `@/modules/env` and tenant Settings; no `process.env.X` in the service. |
| 11 | Logging & audit | ⚠️ | Best-effort `AiUsageLog` persisted (no key leakage in logs); no dedicated fire-and-forget audit-log event for the AI action. |
| 12 | Security hardening | ✅ | Provider keys never logged; rate-limit helpers present; feature/quota gate before spend; safe error text. |
| 13 | Naming & file organization | ✅ | `AIService` PascalCase, kebab/dot-suffixed files, `entities/` layout, snake_case module dir — conforms. |

## Recommendations
1. **(High)** Replace the three `throw new AIError(..., 'NOT_CONFIGURED')` sites with `AppError(message, 503, ErrorCode.FEATURE_NOT_AVAILABLE)` (or pass an explicit `statusCode` to `AIError`) so routes get a correct HTTP status.
2. **(High)** Add `modules/ai/ai.messages.ts` and move the user-facing "Provider … is not configured" literals into it (Logger strings are operator-facing and out of scope for this rule).
3. **(Medium)** Filter `chat`/`chatStream`/`embed` return values through a `Safe*Schema` before returning to callers.
4. **(Medium)** Emit a fire-and-forget audit-log event for chat/embed invocations in addition to the `AiUsageLog` row.
5. **(Low)** Bound the static `_tenantProviders` cache (LRU/TTL) and batch `getUsage` Redis reads with a single `MGET`.

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `validation-philosophy.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `code-structure-ts-master.md` · Source: `modules/ai/ai.service.ts` (context: `ai.types.ts`, `entities/ai_usage_log.entity.ts`, `ai.setting.keys.ts`, `providers/base.provider.ts`, `modules/common/app-error.ts`)
