# logger — Posture Review

> **Uygulandı:** 2026-06-11 — Medium: added recursive redact() with REDACTED_KEYS denylist + depth/size caps in serialize; Low: any[] → unknown[] on serialize and 4 public log methods.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `logger.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 1m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `logger.service.ts` | 103 | Winston-based static logging singleton. Three process-wide loggers (info/warn/error), `AsyncLocalStorage`-backed per-request context tagging (`runWithContext`/`getContext`), argument serialization, and console-vs-file transport selection driven by `env.NODE_ENV`. |

## Findings

### 🟡 Medium
- **[Dimension 12 — Security hardening] No secret/PII redaction in serialized log args** — `serialize` runs raw `JSON.stringify` over arbitrary objects and `String(...)` over the rest, then appends the result to the line. A caller doing `Logger.error('DB failure', error)` or `Logger.info('SSO', { token })` will write tokens/secrets/PII verbatim to console or the daily file. As the central logging primitive, this is the correct place to scrub known-sensitive keys (`password`, `token`, `secret`, `authorization`, `apiKey`, etc.). Evidence: `modules/logger/logger.service.ts:64`. Rule: `security-hardening.md`. Fix: add a recursive redactor in `serialize` that masks values for a denylist of key names (and depth/size caps) before stringifying.

### 🔵 Low
- **[Dimension 2 — Boundary validation] `serialize(...args: any[])` and method signatures use `any`** — the variadic args are typed `any[]`, defeating type safety at the logging boundary. Acceptable for a generic logger but loosens the input contract. Evidence: `modules/logger/logger.service.ts:64`, `:87-102`. Rule: `validation-philosophy.md`. Fix: widen to `unknown[]` and narrow inside `serialize`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `export default class Logger` with only static members; never instantiated; single default export. |
| 2 | Boundary validation | ⚠️ | No external/DB boundary to validate; args typed `any[]` (Low). No `Safe*Schema` because nothing is returned from a DB. |
| 3 | Error handling | ✅ | Service throws nothing; it is the sink, not a thrower. No raw `Error`, no swallowed AppError. |
| 4 | Messages pattern | ✅ | No user-facing strings. The inline tokens (`[DEBUG]`, `tenant=`/`user=`/`req=`) are log format scaffolding, not end-user messages — not a messages-pattern violation. |
| 5 | DB access & entity ownership | — | No DB, no entities — pure infrastructure. |
| 6 | Multi-tenancy | ✅ | No queries; correctly carries `tenantId` only as a log tag via `AsyncLocalStorage`, never as a data filter. |
| 7 | Authorization / RBAC | — | No resource access to authorize; logging primitive. |
| 8 | Service composition & boundaries | ✅ | No sub-services; single clean dependency on `@/modules/env` via the alias. No cross-module cycles. |
| 9 | Caching | — | No read path; caching N/A. |
| 10 | Secrets & config | ✅ | `env.NODE_ENV` only, via `@/modules/env`; no `process.env.X` in the service. |
| 11 | Logging & audit | ⚠️ | This is the logging primitive; no audit-log emission expected. But it does no redaction of secrets in serialized payloads (see Dim 12). |
| 12 | Security hardening | ⚠️ | No redaction of sensitive keys before writing log lines (Medium). |
| 13 | Naming & file organization | ✅ | `logger` snake-case module, `logger.service.ts` kebab/suffix, `Logger` PascalCase class — all conventional. |

## Recommendations
1. Add a secret/PII redactor inside `serialize` (denylist of key names + depth/size caps) so callers cannot accidentally leak tokens or passwords into console/file sinks. (Dim 12, highest value.)
2. Replace `any[]` with `unknown[]` in `serialize` and the four log methods to tighten the input contract. (Dim 2.)

## References
- Rules: `security-hardening.md`, `logging-monitoring-and-audit-trails.md`, `validation-philosophy.md`, `env-and-config.md`, `code-structure-ts-master.md` · Source: `modules/logger/logger.service.ts`
