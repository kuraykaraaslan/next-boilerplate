# env — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `env.service.ts`
> **Overall grade:** A · **Findings:** 0c / 0h / 0m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `env.service.ts` | 245 | Defines a single Zod `EnvSchema`, parses `process.env` once at module load, and exports the strongly-typed, validated `env` singleton. No business logic, DB access, or runtime methods. |

## Findings

### 🔵 Low
- **[Dimension 2 — Boundary validation] `z.coerce.boolean()` mis-coerces falsy strings** — Every boolean flag uses `z.coerce.boolean()` (e.g. `DEBUG`, `SMTP_SECURE`, `METRICS_ENABLED`, `OTEL_ENABLED`, `ENABLE_BACKGROUND_JOBS`). `z.coerce.boolean()` runs `Boolean(value)`, so any non-empty string — including `"false"` and `"0"` — coerces to `true`; only an unset/empty var yields `false`. This is a known footgun for env flags configured as `FLAG=false`. Evidence: `modules/env/env.service.ts:8`, `:101`, `:230`, `:233`, `:238`. Rule: `zod-validation.md`. Fix: replace with a string-to-boolean preprocessor, e.g. `z.preprocess(v => v === 'true' || v === '1', z.boolean())` (or `z.enum(['true','false']).transform(v => v === 'true')`), so `FLAG=false` resolves to `false`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | — | No service class by design; module is a pure validated config singleton (`export const env = EnvSchema.parse(...)`). Matches module.json `tags: ["infrastructure","core","leaf"]`. |
| 2 | Boundary validation | ✅ | All external input (`process.env`) validated via Zod `parse` at load; fails fast on missing required keys. One Low: `z.coerce.boolean()` mis-coerces `"false"`. |
| 3 | Error handling | ✅ | No raw `throw new Error`. `EnvSchema.parse` throws a `ZodError` at boot, which is the intended fail-fast behavior for a startup config primitive (not a request-path service). |
| 4 | Messages pattern | ✅ | No user-facing strings emitted; the only strings are Zod defaults/section comments. No `.messages.ts` needed. |
| 5 | DB access & entity ownership | — | No DB access, no entities; module is pure configuration (README and module.json confirm "no entities, routes, jobs, or providers"). |
| 6 | Multi-tenancy | — | No tenant-scoped queries; provides global defaults consumed as fallback by downstream modules. No `DataSource` usage. |
| 7 | Authorization / RBAC | — | No request handling, no resource access; nothing to authorize. |
| 8 | Service composition & boundaries | ✅ | Leaf module: zero cross-module imports (only `zod`), `dependencies.requires: []`. Single public export `env` re-exported via `index.ts`. |
| 9 | Caching | — | No read path / no Redis; parsed once and held as a singleton. N/A. |
| 10 | Secrets & config | ✅ | This IS the canonical env module — the one permitted place to read `process.env` (`env.service.ts:244`). Secrets are schema-typed and never logged here. |
| 11 | Logging & audit | — | No actions to audit; no log statements (correctly avoids logging secret values). |
| 12 | Security hardening | ✅ | Required secrets enforced via `.min(1)` (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `CSRF_SECRET`, `DATABASE_URL`); sample-rate bounds use `.min(0).max(1)`. No secret leakage, no injection surface. |
| 13 | Naming & file organization | ✅ | snake_case module `env`, kebab-case `env.service.ts`, `index.ts` barrel, `module.json` present. PascalCase `EnvSchema`. |

## Recommendations
1. Replace `z.coerce.boolean()` on all flag keys with an explicit string→boolean preprocessor so `FLAG=false` / `FLAG=0` resolve to `false` (currently they evaluate to `true`). Affects `DEBUG*`, `SMTP_SECURE`, `METRICS_ENABLED`, `OTEL_ENABLED`, `ENABLE_BACKGROUND_JOBS`.
2. Optional: consider `Object.freeze(env)` on export to make the singleton's immutability explicit and prevent accidental runtime mutation.

## References
- Rules: `code-structure-ts-master.md`, `zod-validation.md`, `env-and-config.md`, `secrets-and-configuration-security.md`, `naming-conventions.md`, `import-rules.md` · Source: `modules/env/env.service.ts`
