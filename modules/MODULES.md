# MODULES.md — Module Registry

> **Single-page index of every business-logic module.** Every entry has a `README.md` (human) and a `module.json` (machine, validated against [module.schema.json](module.schema.json)).
> Need the architectural picture? See [../AGENTS.md](../AGENTS.md).

There are **47 modules** under `modules/`. Eighteen of them also have a Next/React extension under [`modules_next/`](../modules_next/COMPONENTS.md).

## Layer rules (recap)

- `modules/` — **no `next/*`, no `react`, no browser APIs.** Framework-agnostic.
- One-way dependency: `app/ → modules_next/ → modules/`.
- Cross-module imports use the path alias `@/modules/<name>/...`.

---

## By tier

### Infrastructure (loaded by everything)

| Module | Description | Key exports | Deps |
|---|---|---|---|
| [common](common/) | `AppError`/`ErrorCode`/`statusCodeFor` + library-sourced locale/country/currency/timezone primitives, Money value object, pagination & log-context types. Leaf, zero deps. | `AppError`, `ErrorCode`, `statusCodeFor`, `LocaleCodeEnum`, `CountryCodeEnum`, `CurrencyCodeEnum`, `TimezoneSchema`, `Money`, `PaginatedResult` | — |
| [env](env/) | Zod-validated `env` object — single source of truth for env vars. | `env` | — |
| [logger](logger/) | Winston structured logger. Use instead of `console.*`. | `logger` | env |
| [redis](redis/) | Shared `ioredis` client, Pub/Sub-safe factory, BullMQ connection helper. | `redis`, `createRedisConnection`, `getBullMQConnection`, `createQueue` | env |
| [db](db/) | TypeORM `DataSource` factory. Single DB by default; opt-in per-tenant DB isolation via `tenant_databases` rows. | `getDataSource`, `tenantDataSourceFor`, `clearTenantDsCache`, `TenantDatabase` | env |
| [redis_idempotency](redis_idempotency/) | Redis-backed idempotency keys for retry-safe POST/PATCH. | `RedisIdempotencyService` | redis, env |
| [limiter](limiter/) | Sliding-window rate limiter + tenant-plan quota enforcement. | `LimiterService`, `TenantPlanLimiterService` | redis, env, *tenant_subscription* |
| [network](network/) | Subnet (CIDR) allowlist matching + shared IP types/enums. Leaf module, zero deps. | `ipMatchesAllowlist`, `ipInSubnet`, `SubnetSchema`, `SubnetListSchema`, `IpVersionEnum` | — |
| [api_doc](api_doc/) | OpenAPI/Swagger spec builder + serving helpers + per-tenant public-docs gate. | `ApiDocService` | env, setting |

### Identity (users, auth, sessions)

| Module | Description | Entities | Deps |
|---|---|---|---|
| [user](user/) | Core user CRUD. | `User` | db, env, logger, common |
| [user_profile](user_profile/) | Avatar, bio, locale, timezone (split from `User`). | `UserProfile` | db, user |
| [user_security](user_security/) | Password hashes, account-lock, TOTP secret, WebAuthn/Passkey credentials. | `UserSecurity` | db, user, env |
| [user_preferences](user_preferences/) | Per-user theme, language, timezone, notification opt-ins. | `UserPreferences` | db, user |
| [user_session](user_session/) | JWT access/refresh issuance + Redis cache + CRUD. **4 sub-services**: token, cache, crud, service. | `UserSession` | db, redis, env, user, user_agent |
| [user_social_account](user_social_account/) | Linked OAuth provider accounts (provider id, external user id). | `UserSocialAccount` | db, user |
| [user_agent](user_agent/) | UA-string parser → device/OS/browser. Used to annotate sessions and audit logs. | — | — |
| [auth](auth/) | Login, register, password reset, email verify, OTP, TOTP. Per-tenant policy (registration/verification/SSO providers/OTP TTLs/bcrypt cost/MFA methods), consent capture, dormant erasure, locale-aware mail/errors, lockout webhook + login-failure metrics. | `UserConsent` | user, user_session, user_security, notification_mail, notification_sms, setting, tenant, tenant_invitation, audit_log, webhook, observability, db, env, redis, common |
| [auth_sso](auth_sso/) | OAuth SSO (12 providers) with per-tenant provider gating + BYO OAuth creds, PKCE-all, encrypted tokens, consent, revoke-on-unlink, locale-aware consent, typed registry, metrics. | — | user, user_session, user_social_account, env, auth, setting, audit_log, observability, redis, tenant, common |
| [auth_saml](auth_saml/) | SAML 2.0 SSO per-tenant IdP config: signature alg, dual-cert rotation, encrypted assertions, SLO, JIT-atomic provisioning, ABAC, metadata import, replay detection, metrics. | `SamlConfig` | db, user, user_session, tenant, env, setting, audit_log, observability, redis, common, logger |
| [auth_impersonation](auth_impersonation/) | Admin impersonation of a target user (always audited). Per-tenant TTL, system-flow route, step-up re-auth, concurrency cap, mandatory reason, tenant opt-out, duration tracking, anomaly webhooks. | — | user, user_session, audit_log, setting, webhook, redis, auth, env |
| [e_signature](e_signature/) | Multi-country e-identity login + e-signature (eIDAS / OIDC4IDA). MVP: TR Mobil İmza login. Doc-signing interfaces scaffolded. | `SigningCertificate`, `TrustListEntry` | db, env, user, user_session, user_security, redis, redis_idempotency, limiter, audit_log, logger |

### Tenancy

| Module | Description | Entities | Deps |
|---|---|---|---|
| [tenant](tenant/) | Tenant CRUD + lifecycle (active/suspended/deleted) + soft-deletion. | `Tenant` | db, env, logger, common |
| [tenant_member](tenant_member/) | Tenant membership + roles (owner/admin/member) + permissions. | `TenantMember` | db, tenant, user |
| [tenant_invitation](tenant_invitation/) | Email invitation: create / accept / decline / revoke. | `TenantInvitation` | db, tenant, tenant_member, notification_mail, user, env |
| [tenant_setting](tenant_setting/) | Per-tenant key-value settings (override system defaults). | `TenantSetting` | db, tenant |
| [tenant_session](tenant_session/) | Tenant-scoped session binding + resolution from request. | — | db, redis, user_session, tenant, env |
| [tenant_branding](tenant_branding/) | Logo, favicon, colors, font, custom CSS (white-label). | — | db, tenant_setting, storage |
| [tenant_domain](tenant_domain/) | Custom domain mapping + DNS verification (TXT/CNAME). | `TenantDomain` | db, tenant, env |
| [tenant_subscription](tenant_subscription/) | Subscription state, plan + feature key resolution, grace period, expiry job. | `TenantSubscription` | db, tenant, payment, redis, env |
| [tenant_usage](tenant_usage/) | Usage metric tracking (API calls, storage GB, seats). | `TenantUsage` | db, tenant |
| [tenant_export](tenant_export/) | Per-tenant data export archive (GDPR-friendly). | — | db, tenant, storage |

### Notifications

| Module | Description | Providers | Deps |
|---|---|---|---|
| [notification_mail](notification_mail/) | Email send, BullMQ-queued. EJS templates in [templates/](notification_mail/templates/). | SMTP, SES, Mailgun, Postmark, Resend, SendGrid | redis, env, setting |
| [notification_sms](notification_sms/) | SMS send. | Twilio, Nexmo, Clickatell, NetGSM | redis, env, setting |
| [notification_push](notification_push/) | Web Push (VAPID) + subscription storage. | — | db, env |
| [notification_inapp](notification_inapp/) | In-app notification feed + unread counts. | — | db, user |

### Billing

| Module | Description | Entities | Providers | Deps |
|---|---|---|---|---|
| [payment](payment/) | Payment processing + subscription plans + plan features + webhook handler. | `Payment`, `PaymentTransaction`, `SubscriptionPlan`, `PlanFeature` | Stripe, PayPal, Iyzico | db, env, setting, common |
| [coupon](coupon/) | Discount coupons + redemption tracking. Provider-aware. | `Coupon`, `CouponRedemption` | Stripe, PayPal, Iyzico | db, env, payment, common |

### Platform

| Module | Description | Entities | Deps |
|---|---|---|---|
| [setting](setting/) | System-wide key-value settings store. Each module declares its keys in `*.setting.keys.ts`. | `Setting` | db, env |
| [storage](storage/) | Pluggable S3-compatible file storage (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO). | — | env, setting |
| [webhook](webhook/) | Outbound webhooks (system + tenant scope) with signed deliveries + retry + redelivery. | `Webhook`, `WebhookDelivery`, `SystemWebhook`, `SystemWebhookDelivery` | db, redis, env |
| [audit_log](audit_log/) | Append-only audit trail (system + per-tenant) with hash-chain tamper-evidence, severity scoring, retention purge, GDPR erasure/export, date-range + cross-tenant queries, CSV/NDJSON export, high-risk webhooks. | `AuditLog`, `TenantAuditLog` | db, env, logger, common, redis, setting, webhook, tenant |
| [api_key](api_key/) | Tenant-scoped API keys (hashed at rest, scope-bound, env-prefixed, subnet-pinned, rotatable). | `ApiKey` | db, env, common, network |
| [api_doc](api_doc/) | OpenAPI / Swagger spec builder. | — | env |
| [feature_flags](feature_flags/) | Tenant-scoped feature flags: master switch, deterministic percentage rollout, attribute targeting rules, per-subject (user/segment) overrides. Read-through cached; audit-logged. | `FeatureFlag`, `FeatureFlagOverride` | db, env, redis, common, audit_log |
| [analytics](analytics/) | Product event analytics: track events, summary (total/unique users/sessions/top events) + dense timeseries via `date_trunc` with gap-filling. | `AnalyticsEvent` | db, env, redis, common |
| [search](search/) | Tenant-scoped full-text search; PostgreSQL FTS provider (`websearch_to_tsquery` + `ts_rank` + `ts_headline`) behind a provider abstraction. Parameterized, injection-safe. | `SearchDocument` | db, env, redis, common |
| [terms_consent](terms_consent/) | Legal agreements + consent. Versioned, immutable, hash-stamped agreement documents (terms, privacy/KVKK, distance-selling, pre-information, refund, cookie, custom) with an append-only acceptance ledger (reusable docs → version+hash; order-specific → verbatim snapshot). Plus the cookie-consent banner + per-purpose ledger. Checkout gate enforces acceptance before payment. Complements `tenant_export`. | `Agreement`, `AgreementVersion`, `AgreementAcceptance`, `ConsentRecord` | db, env, redis, common, audit_log, setting |
| [approval](approval/) | Generic, entity-agnostic moderation / approval queue keyed by `(entityType, entityId)`. Tamper-evident per-tenant decision hash chain + in-memory decision-handler hook; partial unique index enforces one open item per entity; SLA-by-priority. Audit-logged, in-app notified, webhooks per event. | `ApprovalQueueItem` | db, env, logger, common, webhook, audit_log, notification_inapp |
| [support](support/) | Customer support-ticket desk: per-tenant monotonic ticket numbers, agent assignment, internal notes, threaded messages, first-response + resolution SLA tracking (OPEN → PENDING → RESOLVED → CLOSED). Audit-logged, in-app notified, webhooks per event. | `SupportTicket`, `SupportTicketMessage` | db, env, logger, common, webhook, audit_log, notification_inapp |

### AI

| Module | Description | Providers | Deps |
|---|---|---|---|
| [ai](ai/) | Pluggable AI: chat, embeddings, streaming, usage tracking. | Anthropic, OpenAI, Google | env, setting |

---

## Dependency snapshot

Most-imported modules (from grep counts across `modules/`):

| Module | Importers |
|---|---|
| `@/modules/db` | 54 |
| `@/modules/env` | 39 |
| `@/modules/logger` | 35 |
| `@/modules/redis` | 30 |
| `@/modules/setting/setting.service` | 5 |

Adding any infrastructure-tier module (`common`, `env`, `db`, `redis`, `logger`) to `requires` is almost always correct. Cross-domain imports (e.g. `tenant_subscription` ↔ `payment`) are listed in each module's `module.json`.

---

## File-naming convention recap

| Suffix | Role |
|---|---|
| `*.service.ts` | Business logic |
| `*.dto.ts` | Zod input schemas |
| `*.types.ts` | TS types |
| `*.enums.ts` | Enums |
| `*.messages.ts` | User-facing strings |
| `*.setting.keys.ts` | Setting key Zod enum |
| `*.entity.ts` | TypeORM `@Entity` |
| `*.provider.ts` | Pluggable backend implementation |
| `*.job.ts` | BullMQ job processor |
| `*.service.next.ts` | (in `modules_next/`) Next-specific extension |
| `*.test.ts` / `*.test.tsx` | Vitest tests, colocated |

## How to add a new module

See [../AGENTS.md §10](../AGENTS.md#10-how-to-add-a-new-module).

After adding: append a row to this file, write a `README.md`, and write a `module.json` validated against [module.schema.json](module.schema.json).
