# user_agent — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `user_agent.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 3m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `user_agent.service.ts` | 247 | Stateless utility: parse User-Agent string into OS/browser/device metadata (regex) and resolve an IP to an approximate geo-location via ip-api.com. No DB, no tenant state. |

## Findings

### 🟡 Medium
- **[Dimension 12 — Security hardening] Unvalidated IP interpolated into outbound fetch URL (SSRF surface)** — `ip` is passed straight from the caller into the request URL with no shape validation, so a non-IP value (hostname, `metadata.google.internal`, URL fragment, or path-injection characters) reaches the outbound request unsanitized. Only a small set of private-IP string prefixes is filtered (`127.0.0.1`, `localhost`, `192.168.`, `10.`), missing `172.16/12`, `169.254.x` (cloud metadata), IPv6 loopback/link-local, and `0.0.0.0`. Evidence: `modules/user_agent/user_agent.service.ts:180`, `modules/user_agent/user_agent.service.ts:191`. Rule: `security-hardening.md`. Fix: validate `ip` against `z.string().ip()` before use, reject/short-circuit private and reserved ranges (including `172.16/12`, `169.254/16`, IPv6 loopback/ULA/link-local), and encode the value via `encodeURIComponent`.
- **[Dimension 12 — Security hardening] Plain-HTTP outbound geo lookup with no timeout** — the lookup uses `http://ip-api.com/...` (cleartext, tamperable response) and the `fetch` has no `AbortSignal`/timeout, so a slow upstream can stall the calling login path. Evidence: `modules/user_agent/user_agent.service.ts:191`. Rule: `security-hardening.md`. Fix: prefer an HTTPS endpoint and add `AbortSignal.timeout(...)` (e.g. 2–3 s) to the request.
- **[Dimension 2 — Boundary validation] External JSON response consumed without schema validation** — the ip-api.com response is read as untyped `any` (`data.city`, `data.region`, `data.lat`, …) and mapped directly into the returned `GeoLocation` without passing through `GeoLocationSchema.safeParse`. A `GeoLocationSchema` already exists in `user_agent.types.ts` but is not applied to the network boundary. Evidence: `modules/user_agent/user_agent.service.ts:200`, `modules/user_agent/user_agent.service.ts:214`. Rule: `validation-philosophy.md`. Fix: `safeParse` the parsed JSON (or a raw response schema) before constructing the return value.

### 🔵 Low
- **[Dimension 3 — Error handling] Raw `throw new Error` inside the service** — `throw new Error(\`IP API returned ${response.status}\`)` is a raw Error rather than `AppError`. Severity is Low (not High) because it is caught by the surrounding `try/catch` in the same function and never escapes to a route — the method fails open and returns all-null fields. Evidence: `modules/user_agent/user_agent.service.ts:197`. Rule: `error-handling-and-app-error.md`. Fix: since the value is only used for local control flow, replace with a sentinel/early-return or use `AppError` for consistency.
- **[Dimension 13 — Naming] `state` field populated from upstream `region`** — `GeoLocation.state` is filled from `data.region`, and the duplicated `.nullable().nullable()` chains in `user_agent.types.ts` are redundant. Minor; no functional impact. Evidence: `modules/user_agent/user_agent.service.ts:216`, `modules/user_agent/user_agent.types.ts:8`. Rule: `naming-conventions.md`. Fix: optional — rename for clarity and drop the duplicate `.nullable()`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-export class, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | Inputs are null-safe; external geo JSON not run through `GeoLocationSchema` (schema exists but unused at boundary). |
| 3 | Error handling | ⚠️ | One raw `throw new Error` (line 197), but caught locally and fails open; never reaches a route. |
| 4 | Messages pattern | ⚠️ | No `.messages.ts`; only log lines and domain return literals (`'Unknown'`, `'Unknown Device'`) — no user-facing thrown strings. |
| 5 | DB access / entity ownership | — | Stateless utility; no DB, no entities, no transactions. |
| 6 | Multi-tenancy | — | No tenant-scoped data or queries; correctly stateless (README confirms no per-tenant state). |
| 7 | Authorization / RBAC | — | No protected resource; pure parsing/lookup utility. |
| 8 | Service composition | ✅ | Only depends on `@/modules/logger` via the alias; no sub-service cycles or deep imports. |
| 9 | Caching | — | Optional; geo lookups could be cached but no hot in-service read path mandates it. |
| 10 | Secrets / config | ✅ | No `process.env` reads; ip-api.com free tier needs no key. |
| 11 | Logging / audit | ✅ | Failures logged fire-and-forget via `Logger.warn/error`; no secret leakage (only the IP and upstream message). |
| 12 | Security hardening | ❌ | Unvalidated IP in outbound URL (SSRF surface), incomplete private/reserved-range filter, plain HTTP, no request timeout. |
| 13 | Naming / file org | ✅ | snake_case module, kebab-correct suffixes, PascalCase class; minor `state`/`region` and duplicate `.nullable()` nits only. |

## Recommendations
1. Harden `getGeoLocation`: validate `ip` with `z.string().ip()`, reject all private/reserved ranges (`172.16/12`, `169.254/16`, IPv6 loopback/ULA/link-local, `0.0.0.0`), and `encodeURIComponent` the value before interpolating it into the URL.
2. Add an `AbortSignal.timeout(...)` to the `fetch` and switch to an HTTPS endpoint so a slow/cleartext upstream cannot stall or tamper with the login path.
3. Run the ip-api.com response through `GeoLocationSchema.safeParse` (or a raw-response schema) before returning, closing the network boundary.
4. Replace the raw `throw new Error` at line 197 with a local early-return or `AppError`, and drop the redundant `.nullable().nullable()` chains in `user_agent.types.ts`.

## References
- Rules: `security-hardening.md`, `validation-philosophy.md`, `error-handling-and-app-error.md`, `module-messages-pattern.md`, `naming-conventions.md` · Source: `modules/user_agent/user_agent.service.ts`, `modules/user_agent/user_agent.types.ts`, `modules/user_agent/user_agent.enums.ts`
