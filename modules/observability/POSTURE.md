> **Uygulandı** — 2026-06-10: Added inline comments documenting the typed-trust contract for Prometheus label cardinality (route/metric must stay low-cardinality) and the redaction requirement for recordError opts.extra (callers must not place secrets/PII there).

# observability — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** observability.service.ts
> **Overall grade:** A · **Findings:** 0c / 0h / 0m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| observability.service.ts | 124 | Static facade over Sentry + Prometheus: init, setTags, recordHttpRequest, recordError, recordTenantUsage, getMetricsRegistry, flush. No-op when backends unset. |

## Findings

### 🔵 Low
- **[Dimension 12 — Security hardening] Unbounded `route`/`metric` strings used as Prometheus labels.** `recordHttpRequest` passes `sample.route` and `recordTenantUsage` passes `sample.metric` (an open string union, `observability.types.ts:23`) directly into Prometheus label values. If any caller supplies high-variance strings this causes label-cardinality blow-up. Evidence: `modules/observability/observability.service.ts:59`, `:101`. Rule: `security-hardening.md`. Fix: acceptable as a typed-trust facade today; if a non-trusted caller is introduced, bound `route`/`metric` to a known set or clamp cardinality before `.inc()`/`.observe()`.
- **[Dimension 12 — Security hardening] `recordError` forwards arbitrary `opts.extra` to Sentry.** `Object.entries(opts.extra).forEach(([k, v]) => scope.setExtra(k, v))` attaches caller-provided extras verbatim; a caller passing secrets/PII would ship them to Sentry. Evidence: `modules/observability/observability.service.ts:82`. Rule: `security-hardening.md`. Fix: document that callers must not place secrets in `extra`, or add a redaction pass; low severity because data originates from trusted in-process callers, not external input.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `class ObservabilityService` all-static, single `export default`, never instantiated. |
| 2 | Boundary validation | ✅ | Trusts typed `*Sample`/`*Options` inputs validated at the route; no DB output, so no Safe*Schema needed. |
| 3 | Error handling | ✅ | No throws; `flush` swallows Sentry failures intentionally (best-effort shutdown, `:118-122`). No raw `new Error` anywhere. |
| 4 | Messages pattern | ✅ | No user-facing strings; only operator-facing `Logger.info/warn` lines in init modules. No hardcoded UI strings in service. |
| 5 | DB access & entity ownership | — | Pure infra facade; no DB, no entities, no SQL. N/A. |
| 6 | Multi-tenancy | ✅ | No DataSource use; `tenantId` only attached as a Sentry tag / Prometheus label, never used in a query. No isolation surface. |
| 7 | Authorization / RBAC | — | Internal infra facade invoked by boot/instrumentation, not an external resource endpoint. No resource ownership to check. N/A. |
| 8 | Service composition & boundaries | ✅ | Sub-backends hidden behind `getSentry()/getMetrics()` facades; cross-module imports use `@/modules/logger` and `@/modules/env` aliases; no cycles. |
| 9 | Caching | — | No read path that warrants Redis caching. N/A. |
| 10 | Secrets & config | ✅ | All config (`SENTRY_DSN`, `METRICS_ENABLED`, sample rates) via `@/modules/env`; zero `process.env.X` in service or init modules. |
| 11 | Logging & audit | ✅ | This module *is* the observability layer; init logs are fire-and-forget and leak no secrets (DSN never logged). |
| 12 | Security hardening | ⚠️ | Unbounded `route`/`metric` Prometheus labels and verbatim `opts.extra` forwarding (both Low); lazy `await import` of optional deps is guarded. No SSRF/injection surface. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files (`observability.service.ts`, `observability.types.ts`, `sentry.init.ts`, `metrics.ts`), PascalCase class. |

## Recommendations
1. (Low) Bound or whitelist `route` and `metric` label values before passing to Prometheus to prevent label-cardinality explosion if a non-trusted caller is ever introduced; otherwise document the typed-trust contract.
2. (Low) Add a redaction note or pass for `recordError` `opts.extra` so callers do not inadvertently ship secrets/PII to Sentry.
3. No other action needed — the module cleanly follows static-facade, env-config, and composition rules.

## References
- Rules: `code-structure-ts-master.md`, `zod-validation.md`, `error-handling-and-app-error.md`, `env-and-config.md`, `security-hardening.md`, `naming-conventions.md` · Source: `modules/observability/observability.service.ts` (context: `observability.types.ts`, `sentry.init.ts`, `metrics.ts`, `index.ts`, `module.json`)
