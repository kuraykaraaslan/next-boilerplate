# ADR 0002 — Tenants own their provider credentials

**Status:** Accepted (2026-05)

## Context

The original boilerplate read provider credentials (Stripe API key, SMTP host, Anthropic key, AWS bucket, …) from a single global `Setting` table. This is the right model for a single-tenant SaaS but breaks down for a true multi-tenant boilerplate where:

- Each tenant must be able to receive its own payments to its own Stripe / PayPal / Iyzico account.
- Each tenant may want to send mail / SMS through its own provider account (deliverability, sender domain, compliance).
- Each tenant may want to run AI features with its own quota / key.
- Each tenant may need to control where uploads land (S3 region / KMS key).

## Decision

The `Setting` table gained a `tenantId` column and a composite primary key `(tenantId, key)`. Every provider service (`PaymentService`, `AIService`, `MailService`, `SmsService`, `StorageService`, `CaptchaService`) and every concrete provider implementation takes `tenantId` as its first argument and reads credentials from that tenant's row in `Setting`.

When a tenant has no value for a given key, the provider falls back to the matching `env.*` value so the platform keeps working out-of-the-box during local development. The fallback is explicit per provider (no ambient `NODE_ENV` magic); production deploys are expected to seed the root tenant's Setting row from env at boot.

Examples:

| Service call | What runs |
|---|---|
| `PaymentService.charge(tenantId, …)` | Looks up `stripeSecretKey` in `Setting` keyed by `tenantId`; charges that tenant's Stripe account. |
| `AIService.chat(tenantId, …)` | Looks up `anthropicApiKey` / `openaiApiKey` for `tenantId`; usage tagged by `tenantId`. |
| `MailService.sendWelcomeEmail({ tenantId, … })` | Looks up `smtpHost` for `tenantId`; sends from that tenant's outbox. |
| `StorageService.uploadFile(tenantId, …)` | Looks up `awsBucket`/`awsAccessKey` for `tenantId`; file key is `{tenantId}/{path}`. |

## Consequences

**Positive**
- A tenant can sign up to the platform and immediately start collecting payments to its own Stripe account.
- No cross-tenant credential leak: forgetting to pass `tenantId` is a TypeScript error, not a runtime fallthrough.
- Tenants can experiment with different providers without affecting the platform default.

**Negative**
- Provider instances cannot be singletons. The current implementation accepts the cost of constructing per-tenant clients lazily and caching them in a `Map<tenantId, client>` per service. Memory pressure under thousands of tenants needs a future LRU eviction layer.
- Webhook ingestion paths (Stripe webhooks, etc.) must derive `tenantId` from the inbound payload / URL before signature verification — see `payment.webhook.service.ts` for the pattern.

## Migration

The merge happened in three waves:
1. `Setting` entity got `tenantId`, `SettingService.X()` signatures gained `(tenantId, …)`.
2. Provider implementations grew per-tenant credential resolution (`resolveCreds(tenantId)`).
3. Callers up the chain (routes, cron jobs, payment service) thread `tenantId` through.

For platform-level callers that don't have a natural tenant context (the maintenance-mode check in `proxy.ts`, idle-token cleanup jobs), the convention is to use `ROOT_TENANT_ID` as the explicit tenant — never an implicit default.
