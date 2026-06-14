# Good to Have — Environment

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Secrets Management Integration

### ✅ AWS Secrets Manager / HashiCorp Vault Loader
**Why:** All secrets (DB URLs, API keys, payment provider credentials) are loaded from flat `.env` files; in production these should be fetched at boot from a secrets manager so they are rotated without redeployment.
**Complexity:** High
**Multi-tenant relevance:** Platform operators managing N tenants cannot manually rotate per-tenant credentials stored in env files; a secrets-manager loader enables zero-downtime rotation and per-secret audit trails.
**Multi-country relevance:** Data-sovereignty regulations in some countries (e.g. Turkey's KVKK, Germany's BSIG) require secrets to be stored in country-specific vaults; a pluggable loader abstraction allows regional vault endpoints to be configured per deployment.

### ✅ Secret Rotation Detection Hook
**Why:** When a secret (e.g. `ACCESS_TOKEN_SECRET`) is rotated in a secrets manager, the running process continues using the stale cached value until it restarts; there is no mechanism to detect and reload changed secrets at runtime.
**Complexity:** High
**Multi-tenant relevance:** A compromised credential that is rotated must take effect immediately platform-wide, not at the next rolling deploy; a rotation hook prevents a window where invalidated tokens remain accepted.
**Multi-country relevance:** Regional compliance officers may require immediate credential revocation on demand; a reload hook decouples the secret lifecycle from the deployment lifecycle.

## Multi-Region Configuration

### ✅ Per-Region Environment Overlay
**Why:** A single `process.env` flat namespace cannot express that `REDIS_URL` or `DATABASE_URL` should point to a regional endpoint when the pod is running in `eu-west-1` vs `us-east-1`; there is no region-aware config overlay mechanism.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants whose data must reside in a specific region need the DB and cache URLs to be routed to that region; today this requires separate deployments with entirely separate env files.
**Multi-country relevance:** A `DEPLOYMENT_REGION` env var combined with a region overlay file (`env.eu.ts`, `env.us.ts`) allows a single codebase to be deployed in multiple countries without duplicating the entire config schema.

### ✅ DEPLOYMENT_REGION Variable with Typed Enum
**Why:** Region information is absent from the schema entirely; downstream modules that need to route mail, SMS, or storage to a regional provider have no canonical source of truth for the current deployment region.
**Complexity:** Low
**Multi-tenant relevance:** Region-aware rate limiting and SLA tracking requires knowing which region a request originated from; the `DEPLOYMENT_REGION` feeds this signal.
**Multi-country relevance:** GDPR Article 30 processing records require the geographic location of data processing; a validated, typed `DEPLOYMENT_REGION` in `env` is the authoritative source for this metadata.

## Validation Improvements

### ✅ Startup Validation Report Mode
**Why:** The current `EnvSchema.parse(process.env)` throws a `ZodError` on the first validation failure and dumps the raw Zod error object; a human-readable report listing all missing/invalid variables simultaneously would save significant developer time during initial deployment.
**Complexity:** Low
**Multi-tenant relevance:** Platform teams deploying to a new tenant environment need a clear checklist of what is misconfigured, not a cryptic Zod stack trace, to accelerate onboarding.
**Multi-country relevance:** Country-specific deployments often add new required variables (e.g. `NETGSM_*` for Turkey, `BANKID_SE_*` for Sweden); a full validation report at boot surfaces all gaps at once.

### ✅ `env.example` Completeness CI Check
**Why:** New variables are regularly added to `env.service.ts` without a corresponding entry in `.env.example`; there is no automated check that the two files stay in sync.
**Complexity:** Low
**Multi-tenant relevance:** Operators onboarding a new tenant environment copy `.env.example` as their starting point; missing variables cause silent partial configuration.
**Multi-country relevance:** Country-specific variables (e.g. e-signature provider keys for specific jurisdictions) are easily forgotten in `.env.example` when a developer adds them for a single-country rollout.

### ✅ Conditional Required Variables
**Why:** Variables like `SMTP_HOST` are optional even when `MAIL_PROVIDER=smtp`, meaning a misconfigured mail provider is not caught at boot but only when the first email is attempted.
**Complexity:** Medium
**Multi-tenant relevance:** Platform-wide mail outages affect all tenants; catching the misconfiguration at startup is far cheaper than debugging a silent failure during an onboarding email flow.
**Multi-country relevance:** Different countries use different SMS and mail providers (e.g. `NETGSM_*` is Turkey-specific, `TWILIO_*` is global); a conditional validation rule that requires the provider's variables only when that provider is selected catches regional misconfigurations at boot.

## Security Hardening

### ✅ Immutable Env Singleton
**Why:** The exported `env` object is a plain mutable object; any module can write `env.DATABASE_URL = 'evil'` at runtime without a type error or runtime guard.
**Complexity:** Low
**Multi-tenant relevance:** Accidental mutation of a shared singleton can silently redirect all tenant traffic to a wrong database URL with no observable error until queries fail.
**Multi-country relevance:** No direct country relevance, but immutability is a baseline security property for a config primitive used by all downstream modules.

### ✅ Secret Redaction in Error Logs
**Why:** If a `ZodError` is ever caught and logged (e.g. in a catch-all error handler), the raw `process.env` values including secrets could appear in the log output.
**Complexity:** Low
**Multi-tenant relevance:** Secrets appearing in logs are a platform-wide credential exposure risk that affects all tenants simultaneously.
**Multi-country relevance:** GDPR and similar laws require that credentials and personal data do not appear in logs; a redaction layer at the env parsing stage is the right place to enforce this.

## Observability

### ✅ Structured Boot Log of Non-Secret Variables
**Why:** There is no structured log entry emitted at startup listing which optional features are enabled (`METRICS_ENABLED`, `OTEL_ENABLED`, `ENABLE_BACKGROUND_JOBS`, `MAIL_PROVIDER`, etc.), making it hard to confirm the running configuration in a deployed environment.
**Complexity:** Low
**Multi-tenant relevance:** Platform support teams debugging a tenant issue need to know which providers are active on the running instance without accessing the deployment console.
**Multi-country relevance:** Regional deployments with different provider configurations (e.g. EU uses SES, TR uses SMTP) need their active configuration visible in structured logs for compliance audit trails.
