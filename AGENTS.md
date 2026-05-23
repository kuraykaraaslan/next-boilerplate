# AGENTS.md — AI Agent Orientation Guide

> **Read this first.** This file is the AI-readable map of the entire project: what lives where, what the rules are, and which file to open for any given task. It is the canonical entry point for any AI coding assistant (Claude Code, Cursor, Copilot, Aider, OpenCode, etc.) working in this repo.

## 0. Machine-readable catalog + MCP server

Before grepping or guessing — fetch the catalog. Static snapshots live under `public/` (rebuild with `npm run registry:snapshot`):

| Surface | Path | What's in it |
|---|---|---|
| Full registry | [`public/registry/registry.json`](public/registry/registry.json) | Modules + routes + entities + components + conventions |
| Slim index | [`public/registry/registry.index.json`](public/registry/registry.index.json) | Same shape, no inlined READMEs |
| Modules | [`public/registry/modules.json`](public/registry/modules.json) | 41 modules with dependencies, exports, READMEs |
| Routes | [`public/registry/routes.json`](public/registry/routes.json) | ~151 API route handlers (scope, methods, owning module) |
| Entities | [`public/registry/entities.json`](public/registry/entities.json) | ~31 TypeORM entities (columns, relations, schema) |
| Components | [`public/registry/components.json`](public/registry/components.json) | ~97 `modules_next/` surface entries |
| Per-module | `public/modules/<id>.md` | One markdown file per module — README + dependency map + owned routes/entities/UI |
| Module index | [`public/modules/_index.json`](public/modules/_index.json) | `{ id → { tier, hasNextLayer, routeCount, … } }` |
| Schema | [`public/schemas/registry-v1.json`](public/schemas/registry-v1.json) | JSON Schema for the registry shape |
| llms.txt | [`public/llms.txt`](public/llms.txt) | llms.txt-convention summary for AI agents |

**MCP server** in [`.mcp.json`](.mcp.json) (script: [`scripts/mcp-server.mjs`](scripts/mcp-server.mjs)). Tools: `list_modules`, `get_module`, `search_modules`, `list_routes`, `search_routes`, `list_entities`, `get_entity`, `list_components`, `get_conventions`, `get_module_readme`, `read_file`. Zero-dependency, stdio JSON-RPC, works with Claude Desktop / Cursor / Cline / Windsurf / Zed.

**Editor-native rule mirrors** of this file: [`.cursor/rules/next-boilerplate.mdc`](.cursor/rules/next-boilerplate.mdc), [`.cursorrules`](.cursorrules), [`.windsurfrules`](.windsurfrules), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`.clinerules`](.clinerules).

> ⚠️ **Keep the catalog in sync (REQUIRED).** Any time you **add, rename, or remove** a module, route handler, TypeORM entity, `modules_next/` component, hook, provider, or BullMQ job, you **must** rebuild the catalog before committing:
>
> ```bash
> npm run registry:snapshot
> ```
>
> This regenerates `public/registry/*.json` and `public/modules/*.md` from filesystem state. The script also runs automatically via the `prebuild` npm hook before `npm run build`, but commit the regenerated files so the catalog stays in lockstep with the code. A stale catalog is worse than no catalog — it misleads every AI agent that reads it.

## 1. What this project is

A **production-grade, multi-tenant SaaS starter** built on Next.js 16 (App Router + RSC) with a strict three-layer architecture: framework-agnostic business logic, a Next.js binding layer, and the app routes themselves.

- **Framework**: Next.js 16 · React 19 · TypeScript 5 (strict)
- **DB**: PostgreSQL (TypeORM, single shared schema; the root tenant `00000000-0000-4000-8000-000000000000` owns the platform-level config) · **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT (httpOnly), OTP, TOTP, SAML, OAuth (12+ providers), WebAuthn/Passkeys
- **Payments**: Stripe, PayPal, Iyzico · **Email**: 7 providers · **SMS**: 4 providers · **Storage**: 4 S3-compatible providers
- **UI**: Tailwind 4 · Radix · CVA · FontAwesome · **State**: Zustand 5 · **Forms**: react-hook-form + Zod

Tenancy modes: `domain` (subdomain per tenant) or `path` (`/t/{tenantId}/...`). The proxy in [proxy.ts](proxy.ts) rewrites incoming URLs to the correct internal route.

## 2. Architecture: the three layers

```
app/  ──→  modules_next/  ──→  modules/
                                  ↑
                            express-app/ (or any other runtime)
```

Strict **one-way dependency**:

| Layer | What lives here | Imports allowed |
|---|---|---|
| [modules/](modules/) | Framework-agnostic business logic — services, DTOs, entities, types, enums, messages. **No `next/*`, no `react`, no browser APIs.** | Other `modules/*`, npm packages |
| [modules_next/](modules_next/) | Next.js binding layer — React components, hooks, `NextRequest`/`NextResponse` service extensions, axios client. | `modules/*` + Next/React |
| [app/](app/) | Next.js App Router — pages, layouts, route handlers. Thin glue. | Both layers above |

**Rule**: `modules/` never imports from `modules_next/` or `app/`. Violations break the Express/other-runtime story and are caught in review.

## 3. Top-level discovery map

```
.
├── AGENTS.md                 ← you are here
├── README.md                 ← human-facing intro
├── SECURITY.md               ← security model & threat scenarios
├── CRON.md                   ← scheduled jobs reference
├── proxy.ts                  ← Next middleware: tenant resolution + URL rewrite
├── next.config.ts            ← Next.js config
├── tsconfig.json             ← path alias: @/* → ./*
├── vitest.config.ts          ← test runner config
├── eslint.config.mjs         ← lint rules
├── postcss.config.mjs        ← Tailwind 4 PostCSS
├── docker-compose.yml        ← local Postgres + Redis
├── Dockerfile                ← production image
├── global.d.ts               ← ambient TS types
│
├── app/                      ← Next.js App Router
│   ├── layout.tsx            ← root layout (HTML shell)
│   ├── providers.tsx         ← React context providers (theme, i18n, toast)
│   ├── globals.css           ← Tailwind entry
│   └── tenant/[tenantId]/    ← every page/API lives under a tenant; root tenant
│       │                      hosts platform admin + super-admin surface
│       ├── admin/            ← tenant admin dashboard pages (members, invitations,
│       │                       webhooks, settings, me, ai, coupons, fleet, health,
│       │                       payments, plans, saml, tenants, users …)
│       ├── api/              ← tenant API route handlers (flat — no /admin/ segment)
│       ├── auth/             ← tenant auth pages (login/register/select-tenant/…)
│       └── api-docs/         ← Swagger UI (root tenant = SYSTEM_SPEC, others = TENANT_SPEC)
│
├── modules/                  ← framework-agnostic business logic (41 modules)
│   ├── README.md             ← layer rules
│   ├── MODULES.md            ← machine-readable module index
│   ├── module.schema.json    ← JSON Schema for each module.json
│   └── <module>/             ← see §5 for module file conventions
│
├── modules_next/             ← Next/React binding layer (18 modules)
│   ├── README.md             ← layer rules
│   ├── COMPONENTS.md         ← UI component catalog
│   ├── common/               ← shared cross-module UI/utils
│   │   ├── ui/               ← Button, Modal, Form, Table, Toast, …
│   │   │   └── layout/       ← AppShell, AdminShell, AppSidebar, AppTopBar
│   │   ├── axios/            ← axios.client.ts (withCredentials)
│   │   ├── utils/            ← cn.ts
│   │   └── module.types.ts   ← React-aware runtime types
│   └── <module>/             ← per-module: ui/, hooks/, *.service.next.ts
│
├── scripts/                  ← one-off CLI scripts
│   ├── default-admin.ts      ← seed system admin
│   ├── default-tenant.ts     ← seed default tenant
│   └── migrate-api-keys.ts   ← data migration helper
│
└── public/                   ← static assets served at /
```

## 4. Path alias

There is **one** alias configured in [tsconfig.json](tsconfig.json):

```
"@/*": ["./*"]
```

Everything is root-relative. Examples:

```ts
import { UserService } from "@/modules/user/user.service";
import { axiosInstance } from "@/modules_next/common/axios";
import { Button } from "@/modules_next/common/ui/Button";
```

## 5. Module structure conventions

Every module under `modules/<name>/` is self-contained and follows this layout (only files that apply exist):

```
<module>/
├── README.md                          ← REQUIRED: what the module does
├── module.json                        ← machine-readable manifest (see module.schema.json)
├── <module>.service.ts                ← business logic (one or more)
├── <module>.service.test.ts           ← unit tests
├── <module>.dto.ts                    ← Zod schemas for input validation
├── <module>.dto.test.ts               ← DTO tests
├── <module>.types.ts                  ← TypeScript types
├── <module>.enums.ts                  ← enum constants
├── <module>.messages.ts               ← user-facing strings (errors, success)
├── <module>.setting.keys.ts           ← Zod enum of setting keys this module owns
├── index.ts                           ← optional barrel export
├── entities/                          ← TypeORM @Entity classes
│   └── <name>.entity.ts
├── providers/                         ← pluggable provider implementations (AI, payment, mail, sms, storage, sso, coupon)
│   ├── base.provider.ts               ← abstract base
│   └── <provider>.provider.ts         ← concrete impl (stripe, twilio, ses, …)
├── dictionaries/                      ← i18n strings for this module
│   ├── en.json
│   ├── tr.json
│   ├── es.json
│   └── index.ts
└── templates/                         ← (notification_mail only) EJS email templates
```

**File-naming convention**: dot-separated suffix tells you the file's role at a glance.
- `*.service.ts` → business logic class
- `*.dto.ts` → Zod input schemas
- `*.types.ts` → TS types/interfaces
- `*.enums.ts` → enums
- `*.messages.ts` → string constants
- `*.setting.keys.ts` → setting key enum
- `*.entity.ts` → TypeORM entity
- `*.provider.ts` → pluggable backend
- `*.job.ts` → BullMQ job processor
- `*.service.next.ts` → (in `modules_next/`) Next-specific service extension
- `*.test.ts` / `*.test.tsx` → Vitest tests colocated next to source

## 6. Where to find things — quick index

| I need to… | Open |
|---|---|
| understand the overall architecture | this file + [README.md](README.md) |
| find every module at a glance | [modules/MODULES.md](modules/MODULES.md) |
| find every shared UI component | [modules_next/COMPONENTS.md](modules_next/COMPONENTS.md) |
| read what a module does | `modules/<name>/README.md` |
| see the machine-readable spec of a module | `modules/<name>/module.json` (validated against [modules/module.schema.json](modules/module.schema.json)) |
| change tenant routing/proxy rules | [proxy.ts](proxy.ts) |
| add a new API endpoint | `app/tenant/[tenantId]/api/...` (root-tenant-only handlers go under `api/admin/`) |
| add a new business-logic module | create `modules/<name>/` (see §10) |
| change the DB schema | `modules/<name>/entities/*.entity.ts` |
| change setting keys | `modules/<name>/<name>.setting.keys.ts` |
| change i18n strings | `modules/<name>/dictionaries/*.json` |
| change email templates | [modules/notification_mail/templates/](modules/notification_mail/templates/) |
| add an OAuth provider | [modules/auth_sso/providers/](modules/auth_sso/providers/) |
| add a payment provider | [modules/payment/providers/](modules/payment/providers/) |
| add a storage provider | [modules/storage/providers/](modules/storage/providers/) |
| add a mail provider | [modules/notification_mail/providers/](modules/notification_mail/providers/) |
| add an SMS provider | [modules/notification_sms/providers/](modules/notification_sms/providers/) |
| add an AI provider | [modules/ai/providers/](modules/ai/providers/) |
| add a coupon provider | [modules/coupon/providers/](modules/coupon/providers/) |
| see scheduled jobs | [CRON.md](CRON.md) |
| see threat model & security defaults | [SECURITY.md](SECURITY.md) |

## 7. Where the most-imported infrastructure lives

These five modules sit at the bottom of the dependency graph — almost everything uses them:

| Module | What it gives you | Typical import |
|---|---|---|
| [modules/db](modules/db/) | `getSystemDataSource()`, `tenantDataSourceFor(id)`, `getDefaultTenantDataSource()` (single shared schema; both factories point at the same DB by default) | `import { getSystemDataSource } from "@/modules/db";` |
| [modules/env](modules/env/) | Typed env-var access (single source of truth) | `import { env } from "@/modules/env";` |
| [modules/logger](modules/logger/) | Winston logger | `import { logger } from "@/modules/logger";` |
| [modules/redis](modules/redis/) | Redis client + BullMQ connection | `import { redis } from "@/modules/redis";` |
| [modules/common](modules/common/) | `AppError` (canonical error class) | `import { AppError } from "@/modules/common/app-error";` |

## 8. The 41 modules — index

> Full table with descriptions, dependencies, entities, and machine manifests: [modules/MODULES.md](modules/MODULES.md).

**Infrastructure**: `common` · `db` · `env` · `logger` · `redis` · `redis_idempotency` · `limiter`

**Auth & identity**: `auth` · `auth_sso` · `auth_saml` · `auth_impersonation` · `user` · `user_session` · `user_security` · `user_profile` · `user_preferences` · `user_agent` · `user_social_account`

**Tenants**: `tenant` · `tenant_member` · `tenant_invitation` · `tenant_session` · `tenant_setting` · `tenant_subscription` · `tenant_usage` · `tenant_branding` · `tenant_domain` · `tenant_export`

**Billing & monetization**: `payment` · `coupon`

**Notifications**: `notification_mail` · `notification_sms` · `notification_push` · `notification_inapp`

**Platform**: `setting` · `storage` · `webhook` · `audit_log` · `api_key` · `api_doc` · `ai`

## 9. The 18 Next-bound modules

> Full table: [modules_next/COMPONENTS.md](modules_next/COMPONENTS.md).

Modules with React UI: `auth`, `ai`, `audit_log`, `auth_saml`, `coupon`, `payment`, `tenant`, `tenant_subscription`, `user`, `user_security`, `api_doc`

Modules with React hooks: `notification_inapp` (`use-notifications`), `tenant_subscription` (`use-feature-access`, `use-grace-period`)

Modules with Next service extensions (`*.service.next.ts`): `audit_log`, `tenant_session`, `user_session`, `limiter`

Cross-module shared infrastructure: `common/` (axios client, 30+ UI primitives, layout shells, type registry)

## 10. How to add a new module

1. **Create the folder**: `modules/<new_module>/`
2. **Files** (use existing modules as templates):
   - `<new_module>.service.ts` — the class
   - `<new_module>.dto.ts` — Zod schemas (if it has external input)
   - `<new_module>.types.ts` — TS types
   - `<new_module>.messages.ts` — string constants
   - `<new_module>.enums.ts` — enums (if needed)
   - `entities/<thing>.entity.ts` — TypeORM entity (if it owns DB state)
   - `<new_module>.setting.keys.ts` — Zod enum (if it has settings)
   - `<new_module>.service.test.ts` — tests
   - `README.md` — **REQUIRED**: what it does, public API, dependencies, examples
   - `module.json` — **REQUIRED**: machine-readable manifest (validate against [modules/module.schema.json](modules/module.schema.json))
3. **Register the entity** in the appropriate DataSource ([modules/db/db.system.ts](modules/db/db.system.ts) for shared platform entities, or [modules/db/db.tenant.ts](modules/db/db.tenant.ts) for per-tenant tables)
4. **Update the index**: add a row to [modules/MODULES.md](modules/MODULES.md)
5. **If it needs Next/React**: add `modules_next/<new_module>/` with `ui/`, `hooks/`, or `*.service.next.ts`
6. **If it needs routes**: add handlers under `app/tenant/[tenantId]/api/...` (root-tenant-only handlers go under `app/tenant/[tenantId]/api/admin/...`)
7. **Tests**: run `npm test`

## 11. How to add a UI component

| Component is… | Put it in |
|---|---|
| Used by ≥ 2 modules (Button, Modal, Input, Toast, …) | [modules_next/common/ui/](modules_next/common/ui/) |
| App shell / layout chrome (Sidebar, TopBar, Shell) | [modules_next/common/ui/layout/](modules_next/common/ui/layout/) |
| Specific to one module (LoginForm, PaymentSummaryCard, …) | `modules_next/<module>/ui/` |
| A React hook tied to one module | `modules_next/<module>/hooks/use-*.hook.ts` |

After adding, update [modules_next/COMPONENTS.md](modules_next/COMPONENTS.md).

## 12. Multi-tenancy in one paragraph

Every page and API lives under `app/tenant/[tenantId]/`. The **root tenant** (`ROOT_TENANT_ID = 00000000-0000-4000-8000-000000000000`, name `"Platform"`) is a real tenant row — there is no separate "system" surface. A **super-admin** is a `TenantMember` of the root tenant with `memberRole = 'ADMIN'`; the admin guard ([modules_next/auth/auth.admin-guard.next.ts](modules_next/auth/auth.admin-guard.next.ts)) authenticates against root-tenant membership. Platform-wide pages (tenant CRUD, global users, plans, coupons, fleet, health, AI playground) live under `app/tenant/[tenantId]/admin/*` and guard themselves with `isRootTenant(tenantId)` so they 404 from any other tenant. [proxy.ts](proxy.ts) inspects host/path: `localhost` or `{ROOT_SUBDOMAIN}.{WILDCARD}` → `ROOT_TENANT_ID`; other domains → `TenantDomain` lookup. Path-mode uses `/t/{tenantId}/…`. The public API surface is `/api/tenant/{tenantId}/...` (rewritten to `/tenant/{tenantId}/api/...`). DataSource-wise there are still two factories (`getSystemDataSource`, `tenantDataSourceFor`), but they point at the same Postgres schema by default — the split is structural, not physical.

**Tenant-owned configuration.** Each tenant owns its own row in the `settings` table (a single composite-key `(tenantId, key)` store; the legacy split into `settings` + `tenant_settings` was merged) and configures its own **provider credentials**: Stripe / PayPal / Iyzico / Alipay / CloudPayments / WeChat / YooKassa for payments, Anthropic / OpenAI / Google for AI, SMTP / SES / Mailgun / Postmark / Resend / SendGrid for email, Twilio / Nexmo / Clickatell / NetGSM for SMS, S3 / R2 / Spaces / MinIO for storage, hCaptcha / reCAPTCHA for captcha. The corresponding service layers (`PaymentService`, `AIService`, `MailService`, `SmsService`, `StorageService`, `CaptchaService`) and every concrete provider implementation take `tenantId` as their first argument and read settings from that tenant's row — so when a customer pays a tenant, the money lands in *that tenant's* Stripe account; when a tenant sends an email, it goes through *that tenant's* SMTP. Plans, coupons and audit logs are also tenant-scoped. The root tenant just happens to own the platform's defaults via its own settings row.

**Tenant create seed.** `TenantService.create()` (and the personal-tenant auto-provision on user signup) seeds every new tenant with a Free `SubscriptionPlan`, a `TenantSubscription` bound to it, and minimum-functional locale settings (`language=en`, `dateFormat=YYYY-MM-DD`, `timezone=UTC`). The seed is best-effort, skipped for the root tenant, and opt-out per step via `CreateTenantDTO.defaults`.

**Usage tracking & feature gating.** Every tenant-scoped service that costs the operator money (`AIService.chat`, `StorageService.uploadFile`, `MailService.sendXxxEmail`, `SmsService.sendShortMessage`) increments `TenantUsage` (`apiCalls`, `aiTokens`, `storageBytes`, `emailSends`, `smsSends`) and writes a persistent audit row (`AiUsageLog`, `UploadedFile`, `NotificationLog`). The `tenant-usage-flush` hourly cron (see [CRON.md](CRON.md)) persists Redis counters to the `TenantUsage` table before the monthly TTL expires. Feature access uses `TenantSubscriptionService.assertFeatureAccess(tenantId, 'feature_…', currentCount?)` — wired into AI, mail, SMS, storage, webhook, and API-key services so a tenant on a plan without a feature gets a clean 402/403 rather than silently consuming resources.

**Tenant lifecycle.** Soft-delete via `TenantDeletionService.requestDeletion()` schedules a 30-day grace period; the `purge-expired-tenants` daily cron hard-removes anything past the horizon. `TenantExportService.exportTenantData(tenantId)` ships a JSON dump of every tenant-scoped row (members, domains, audit, webhooks, settings, payments, subscriptions, plans, coupons, api keys, SAML, uploaded files, AI usage, notifications, usage stats) — GDPR portability without bespoke per-customer extraction code. The `tenant-domain-dns-recheck` 6-hourly cron re-resolves every `ACTIVE` `TenantDomain` and marks broken ones `DNS_FAILED` so SSL cert provisioning and HTTP routing don't drift silently.

**Defense-in-depth.** Service-layer queries always carry `where: { tenantId }`. As of migration [`001_tenant_rls.sql`](modules/db/migrations/001_tenant_rls.sql) every tenant-scoped table also runs Postgres row-level security keyed on a session variable (`app.current_tenant`) — a forgotten `where` clause in a service is a silently-empty result instead of a cross-tenant leak. See [ADR 0003](docs/adr/0003-migration-framework.md). The proxy / route handler is responsible for `SET LOCAL app.current_tenant = $tenantId` on connection checkout; cron jobs and CLI scripts that legitimately need cross-tenant access connect as a role with `BYPASSRLS` or opt into `app.bypass_rls = 'on'`.

**Observability.** [`Logger.runWithContext({ tenantId, userId, requestId }, fn)`](modules/logger/logger.service.ts) uses `AsyncLocalStorage` to thread the request's tenant + user + request IDs through every async call. Every `Logger.info/warn/error` made inside the wrapped function is automatically tagged `[tenant=… user=… req=…]` — no manual structured-log scaffolding needed in service code. The same context feeds [`ObservabilityService`](modules/observability/observability.service.ts) which fans out to **Sentry** (errors + traces, lazy-loaded via `SENTRY_DSN`) and **Prometheus** (`http_requests_total`, `http_request_duration_seconds`, `errors_total`, `tenant_usage_total` — all labelled by `tenantId`). Routes opt in via [`withObservability(request, handler, { tenantId, route })`](modules_next/observability/withObservability.next.ts) which sets the Logger context, attaches Sentry tags, and records the request/latency/status on the way out. `tenant_session.service.next` also pushes `setTags({ tenantId, userId })` after every successful auth, so downstream service-layer errors land in Sentry with the right tenant attribution. Three Kubernetes-style endpoints expose the stack outside the tenant prefix: [`/api/internal/health`](app/api/internal/health/route.ts) (liveness), [`/api/internal/ready`](app/api/internal/ready/route.ts) (system DB + tenant DB + Redis check), and [`/api/internal/metrics`](app/api/internal/metrics/route.ts) (Prometheus scrape, Bearer-protected when `METRICS_SECRET` is set). Background-job schedulers (subscription expire, dormant sweep, tenant purge, DNS recheck, usage flush) come up from [`instrumentation.ts`](instrumentation.ts) when `ENABLE_BACKGROUND_JOBS=true` — serverless deploys leave it off and use the HTTP cron endpoints. See [ADR 0007](docs/adr/0007-observability-stack.md).

## 13. Testing

Vitest + `@testing-library/react`. Naming convention is colocated and suffix-driven:

| File | Tests |
|---|---|
| `<module>.dto.test.ts` | DTO/Zod validation |
| `<module>.service.test.ts` | service unit tests (mock the data source) |
| `<Component>.test.tsx` | React component tests (mock `axiosInstance`) |

Run: `npm test` · `npm run test:watch` · `npm run test:coverage`

## 14. AI agent etiquette (read before editing)

- **Respect layer boundaries.** Never add `next/*` or `react` imports under `modules/`. If a feature needs them, put the React/Next half in `modules_next/<same_module>/`.
- **Use the path alias `@/`**, not relative `../../../`.
- **Keep filenames in the dotted-suffix convention** (see §5). New files outside the convention erode the AI-discoverability that this guide depends on.
- **Update [modules/MODULES.md](modules/MODULES.md) and the module's `README.md` whenever a module changes** (the project rule: README and module changes ship together).
- **Validate `module.json` against [modules/module.schema.json](modules/module.schema.json)** when you create or edit one.
- **Tests are colocated.** If you edit `auth.service.ts`, expect to touch `auth.service.test.ts` in the same change.
- **No new top-level docs unless asked.** Extend this file or the module README instead.

## 15. Quick verification commands

```bash
npm run lint              # ESLint
npm test                  # full suite
npm run test:coverage     # with coverage report
npm run build             # production build (also catches TS errors)
npm run analyze           # bundle size analysis
```

---

**For human contributors**: [README.md](README.md) has the setup walkthrough.
**For security review**: [SECURITY.md](SECURITY.md).
**For scheduled jobs**: [CRON.md](CRON.md).
