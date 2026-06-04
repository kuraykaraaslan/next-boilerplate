# payment_tax — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_tax.service.ts`
> **Overall grade:** C · **Findings:** 0c / 4h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_tax.service.ts` | 336 | CRUD for tenant tax classes and tax rates, plus the in-memory tax calculation engine (per-line rate matching by destination/class, compound + inclusive pricing, rounding). |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` instead of `AppError`** — Every not-found and failure path throws a raw `Error`, so a route handler cannot derive an HTTP status (404 vs 500) or an `ErrorCode`. Evidence: `modules/payment_tax/payment_tax.service.ts:55` (`updateClass` not-found), `:80` (`deleteClass`), `:112` (`updateRate`), `:124` (`getRate`), `:150` (`deleteRate`), `:192` (`calculateTax` rethrow). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(PAYMENT_TAX_MESSAGES.TAX_RATE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` for not-found cases and `500, ErrorCode.INTERNAL_ERROR` for `CALCULATION_FAILED`.
- **[Dimension 5 — DB access / data integrity] Default-class promotion not atomic** — In `createClass` and `updateClass`, the "unset prior default" `repo.update(...)` and the subsequent `repo.save(...)` run as two separate writes with no transaction. A crash or concurrent create between them can leave a tenant with zero or two default classes, which then changes calculation results (`runCalculation` picks `defaultClass`). Evidence: `payment_tax.service.ts:36-47` and `:58-63`. Rule: `database-patterns.md`. Fix: wrap the demote+save pair in `ds.transaction(async (m) => { ... })`.
- **[Dimension 9 — Caching] `getRate` never populates Redis; invalidations target a key that is never set** — `singleFlight` (`modules/redis/redis.cache.ts:18`) is a pure in-process promise-dedupe helper; it does not read or write Redis. `getRate` wraps the DB read in `singleFlight` but never `redis.set`s the result, so the `redis.del(\`pay:tax:${rateId}\`)` calls in `updateRate` (`:116`) and `deleteRate` (`:152`) delete a key that is never written. The cache is effectively dead code that misrepresents a read-through cache. Evidence: `payment_tax.service.ts:120-127`, `:116`, `:152`. Rule: `caching-patterns.md`. Fix: either implement a real read-through (negative cache, jittered TTL, fail-open `redis.get`/`set`) or remove the cache scaffolding and the `redis.del` calls.
- **[Dimension 11 — Logging / audit] No audit trail for mutating tax operations** — Creating, updating, and deleting tax classes and rates are financially meaningful configuration changes (they alter what every customer is charged), yet none are audit-logged. Only `calculateTax` failures are logged. Evidence: `createClass` `:31`, `updateClass` `:51`, `deleteClass` `:76`, `createRate` `:88`, `updateRate` `:108`, `deleteRate` `:146` — none call an audit logger. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry (actor, tenantId, entity id, action) after each mutating call.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] `getRate` cache key is not tenant-scoped (latent cross-tenant read on key reuse)** — The `singleFlight` / `redis.del` key is `pay:tax:${rateId}` with no `tenantId` prefix. The DB query is correctly tenant-filtered today, so there is no active leak; but if the dead cache (see the Dimension 9 finding) is ever made real, the un-prefixed key would let one tenant's cached rate satisfy another tenant's lookup of the same UUID, and a tenant-A `del` would not invalidate a tenant-B entry. Evidence: `payment_tax.service.ts:116`, `:121`, `:152`. Rule: `multi-tenancy-patterns.md`. Fix: key on `pay:tax:${tenantId}:${rateId}`.
- **[Dimension 7 — Authorization / RBAC] No in-service resource ownership/role check** — Services trust the `tenantId` argument and perform no resource-level role check (authz enforced at route layer; resource-level check not in service — deviation from `authorization-and-rbac.md`). Tenant scoping itself is correct (every query is filtered by `tenantId`). Evidence: all public methods, e.g. `payment_tax.service.ts:31`, `:88`, `:187`. Rule: `authorization-and-rbac.md`. Fix: confirm route middleware enforces tenant-admin RBAC; optionally add a defensive role/ownership assertion in-service.
- **[Dimension 5 — DB access] `deleteRate` hard-deletes while the rest of the module soft-deletes** — `TaxRate` has no `@DeleteDateColumn`, so `deleteRate` calls `repo.remove(row)` (`:151`) which is irreversible, whereas `TaxClass` soft-removes (`deleteClass` `:81`). Hard-deleting a tax rate that historical invoices reference loses the audit/reconstruction trail. Evidence: `entities/tax_rate.entity.ts` (no soft-delete column), `payment_tax.service.ts:151`. Rule: `database-patterns.md`. Fix: add a `@DeleteDateColumn` to `TaxRate` and use `softRemove`, or document the hard-delete decision and block deletion of referenced rates.
- **[Dimension 12 — Security hardening] User-supplied `postalCodePattern` compiled as a regex (ReDoS exposure)** — `matchesPostalCode` builds `new RegExp(\`^${pattern}$\`, 'i')` from a tenant-supplied string (`:332`) and runs it against the destination postal code on every calculation line. A pathological pattern (e.g. nested quantifiers) can cause catastrophic backtracking and pin CPU during tax calculation. The `CreateTaxRateDTO`/`UpdateTaxRateDTO` only validate it as a string. Evidence: `payment_tax.service.ts:330-336`, `payment_tax.dto.ts:32`/`:46`. Rule: `security-hardening.md`. Fix: validate the pattern length/complexity at the boundary, run it under a time budget / `re2`-style safe engine, or restrict patterns to a non-regex prefix/glob form.

### 🔵 Low
- **[Dimension 4 — Messages] Defined-but-unused validation messages signal missing validation paths** — `TAX_CLASS_CODE_EXISTS`, `DEFAULT_TAX_CLASS_NOT_FOUND`, `INVALID_TAX_RATE`, and `INVALID_POSTAL_CODE_PATTERN` exist in `payment_tax.messages.ts` but are never thrown by the service, implying intended guards (duplicate code, no default class, bad rate, bad pattern) that are not implemented. No hardcoded inline user-facing string was found in the service. Evidence: `payment_tax.messages.ts:3,4,7,8` vs. service usages only of `TAX_CLASS_NOT_FOUND` / `TAX_RATE_NOT_FOUND` / `CALCULATION_FAILED`. Rule: `module-messages-pattern.md`. Fix: implement the guards (and throw these via `AppError`) or remove the dead messages.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class of static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | DTOs are Zod; DB output passes through `Safe*`/`*Schema.parse`. Cache key un-tenant-scoped (latent boundary risk — Medium). |
| 3 | Error handling | ❌ | All throws are raw `Error`, never `AppError` with status/`ErrorCode`. |
| 4 | Messages pattern | ✅ | Uses `payment_tax.messages.ts`; no inline strings (some messages unused — Low). |
| 5 | DB access / entity ownership | ⚠️ | Null-checked finds, no raw SQL, entities under `entities/`; but default-class flip and multi-write lack a transaction, and rate delete is a hard delete. |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId`; tax entities are tenant-scoped. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from `authorization-and-rbac.md`). |
| 8 | Service composition / boundaries | ✅ | Single facade, `@/` alias for cross-module imports (`@/modules/db`, `@/modules/redis`, `@/modules/logger`), no sub-service cycles. |
| 9 | Caching | ❌ | `singleFlight` only dedupes in-process; `getRate` never writes Redis, so `redis.del` invalidations are no-ops — broken/misleading cache, not fail-open read-through. |
| 10 | Secrets / config | ✅ | No `process.env` reads; no secrets in the service. |
| 11 | Logging / audit | ❌ | No audit log on create/update/delete of tax classes or rates. |
| 12 | Security hardening | ⚠️ | Tenant-supplied `postalCodePattern` compiled to regex without ReDoS guard. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase class, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. **Replace every `throw new Error(...)` with `AppError`** (404/`NOT_FOUND` for not-found, 500/`INTERNAL_ERROR` for `CALCULATION_FAILED`) so routes can map status codes. (Dimension 3)
2. **Wrap default-class demotion + save in a transaction** in `createClass`/`updateClass` to preserve the "exactly one default" invariant under concurrency/crash. (Dimension 5)
3. **Fix the caching story:** either implement a real tenant-scoped read-through cache (`pay:tax:${tenantId}:${rateId}`, negative cache, jittered TTL, fail-open) or delete the `singleFlight`/`redis.del` scaffolding entirely. (Dimensions 9, 2)
4. **Add fire-and-forget audit logging** to all tax-class and tax-rate mutations. (Dimension 11)
5. **Guard `postalCodePattern`** against ReDoS (length/complexity validation at the boundary or a safe regex engine / non-regex matching). (Dimension 12)
6. **Soft-delete tax rates** (add `@DeleteDateColumn`, use `softRemove`) for consistency and historical-invoice integrity. (Dimension 5)
7. **Implement or remove the unused validation messages** (duplicate code, missing default class, invalid rate/pattern). (Dimension 4)

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `caching-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `module-messages-pattern.md`, `code-structure-ts-master.md`, `naming-conventions.md` · Source: `modules/payment_tax/payment_tax.service.ts`, `payment_tax.dto.ts`, `payment_tax.types.ts`, `payment_tax.messages.ts`, `entities/tax_class.entity.ts`, `entities/tax_rate.entity.ts`, `modules/redis/redis.cache.ts`
</content>
</invoke>
