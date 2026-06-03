# Env Module

Single source of truth for environment-variable access. Parses `process.env` once at module load through a Zod schema and exports a strongly-typed `env` object — typos and missing required values fail fast at boot. This is a leaf module with no dependencies; everything else imports `env` rather than touching `process.env`.

---

## Public API

| Export | Source | Use |
|---|---|---|
| `env` | [env.service.ts](env.service.ts) | Typed accessor: `env.DATABASE_URL`, `env.REDIS_PORT` (already a number), etc. |

`env` is `EnvSchema.parse(process.env)` evaluated once at module load — a frozen, validated singleton. There are no entities, routes, jobs, or providers; the module is pure configuration.

---

## Usage

```ts
import { env } from "@/modules/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const ttl = env.SESSION_CACHE_TTL; // number, already coerced
```

---

## Variable groups

`env.service.ts` groups variables in commented sections — extend the matching section when you add a new key:

- **Core** — `NODE_ENV` (`development` | `production` | `test` | `vercel`), `PORT`, `HOST`, `DEBUG`, `DEBUG_LOCAL`, `DEBUG_TESTS`, `DEBUG_TESTS_REAL_SERVER`
- **Database** — `DATABASE_URL` (required; single Postgres URL — per-tenant DB isolation is done via the `tenant_databases` row, not extra env vars)
- **Redis** — `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Auth / Secrets** (required) — `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `CSRF_SECRET` (+ `*_EXPIRES_IN`)
- **Session / Token TTLs** — `SESSION_CACHE_TTL`, `SESSION_EXPIRY_MS`, `RESET_TOKEN_*`, `EMAIL_VERIFY_*`, `INVITATION_TTL_SECONDS`
- **OTP / TOTP / WebAuthn** — `OTP_*`, `TOTP_*`, `WEBAUTHN_ORIGIN`, `WEBAUTHN_RP_ID`
- **Multi-tenancy** — `TENANCY_MODE` (`domain` | `subdomain` | `path`), `TENANT_WILDCARD_DOMAIN`, `TENANT_DEFAULT_SUBDOMAIN`, `TENANT_PATH_PREFIX`, `TENANT_CACHE_TTL`, `VERIFICATION_DOMAIN`
- **Application** — `APPLICATION_NAME`, `APPLICATION_DOMAIN`, `APPLICATION_HOST`, `APPLICATION_LOGO_TEXT`, `INFORM_MAIL`, `INFORM_NAME`
- **Frontend paths** — `FRONTEND_*_PATH`, `FRONTEND_SUPPORT_EMAIL`
- **NEXT_PUBLIC** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APPLICATION_*`, `NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN`, `NEXT_PUBLIC_TINYMCE_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Push / VAPID** — `VAPID_CONTACT_EMAIL`, `VAPID_PRIVATE_KEY`
- **Mail** — `MAIL_PROVIDER` (default `smtp`), SMTP, Mailgun, Postmark, SendGrid, Resend, AWS SES
- **SMS** — `SMS_*`, Twilio, Nexmo, Clickatell, NetGSM
- **Storage (AWS S3)** — `AWS_ACCESS_KEY_ID`, `AWS_S3_*`, `AWS_REGION`
- **SSO providers** — `SSO_ALLOWED_PROVIDERS` + per-provider client IDs/secrets (GitHub, Google, Apple, LinkedIn, Slack, Meta, Microsoft, Autodesk, TikTok, Twitter, WeChat)
- **AI providers** — `AI_DEFAULT_PROVIDER`, OpenAI / Anthropic / Google keys, models, max-tokens
- **Payment** — `PAYMENT_DEFAULT_PROVIDER`
- **Cron / CORS** — `CRON_SECRET`, `CORS_ORIGIN`
- **Rate Limiting** — `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX` (all defaulted)
- **E-Signature / E-Identity** (eIDAS, OIDC4IDA) — `EID_*`, `EU_LOTL_URL`, `LOTL_SIGNER_CERT_PEM`, `TR_TRUST_ROOTS_PATH`, `TSA_DEFAULT_URL`, Mobil İmza, Smart-ID, BankID SE, Login.gov, `SETTINGS_ENCRYPTION_KEY` (64-hex / 32-byte AES-256-GCM key)
- **Observability** — Sentry (`SENTRY_*`), Prometheus (`METRICS_ENABLED`, `METRICS_SECRET`), OpenTelemetry (`OTEL_*`), `ENABLE_BACKGROUND_JOBS`, `APPLICATION_VERSION`
- **Misc** — `BOOK_LANG`, `DOTENV_KEY`, `NEXT_DEPLOYMENT_ID`, and assorted runtime vars

See [env.service.ts](env.service.ts) for the authoritative, exhaustive schema (defaults, coercions, and per-key comments).

---

## Settings

This module has **no** settings entities or setting keys. It is the lowest-level config primitive: `env` provides the typed, global defaults that downstream modules (`notification_mail`, `ai`, `storage`, `payment`, etc.) read as a fallback when no per-tenant override is configured.

---

## Rules

- **Never** read `process.env.XXX` directly outside this module. Always go through `env.XXX`. This keeps validation centralised and the `.env.example` file authoritative.
- Required values use `z.string().min(1)`; optional values use `.optional()` or `.default(...)`.
- Use `z.coerce.number()` / `z.coerce.boolean()` for non-string types — env vars arrive as strings.
- When you add a key, place it in the matching commented section and update [.env.example](../../.env.example) with a documented placeholder.
- Leaf module: no `next/*`, no `react`, no other-module imports.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Zod-validated singleton env object that parses process.env at boot; provides typed global defaults for all platform configuration. No tenant variability — serves as fallback for per-tenant overrides in downstream modules (notification_mail, ai, storage, payment, etc.).
