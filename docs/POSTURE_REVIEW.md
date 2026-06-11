# Module Service Posture Review — Roll-Up

> **Generated:** 2026-06-04 · **Audited against:** `/home/kuray/00_Config_and_AI_Rules` ("00 rules")
> Per-module detail lives in each **`modules/<module>/POSTURE.md`**. Each module was reviewed by one agent and then re-checked by an adversarial verifier agent that opened every cited `path:line` against the source to strip unsupported findings.

## Scope & coverage
- **57 of 62 modules** reviewed — **100 service files** (5 modules were split into focused files mid-review; all current files are covered).
- **5 modules have no service layer** and are out of scope: `api_doc`, `common`, `db`, `payment_core`, `seed`.

## Grade distribution
| Grade | Meaning | Modules |
| --- | --- | :---: |
| 🟥 D | ≥1 **Critical** | 5 |
| 🟧 C | ≥1 **High**, no Critical | 37 |
| 🟨 B | some Medium, no High | 13 |
| 🟩 A | clean / Low only | 2 |

**Total findings:** 5 Critical · 71 High · 175 Medium · 82 Low.

## Priority — Critical (grade D)
These have a tenant-isolation or data-integrity issue and should be fixed first:

- **`e_signature`** (1C/4H/4M/2L) — **SSRF**: outbound HTTP to attacker-influenceable URLs (OCSP AIA, ETSI LOTL/TSL) with no scheme allow-list or private-IP blocking; LOTL ingested unverified when the signer cert is absent.
- **`tenant_invitation`** (1C/4H/3M/1L) — **Cross-tenant IDOR**: `TenantInvitation` read off the system DataSource; `getById` also missing a `tenantId` filter.
- **`tenant_domain`** (1C/3H/7M/2L) — **Cross-tenant IDOR**: by-id reads/mutations query `TenantDomain` on the system DataSource with **no `tenantId` predicate** while the route passes a bare `domainId`.
- **`payment_sell`** (1C/2H/4M/3L) — **Cross-tenant IDOR**: `payment_transactions` has no `tenantId` column; `listTransactions`/`createTransaction` filter only by a caller-supplied `paymentId`, so in shared-DB mode a caller can read/write another tenant's transaction rows.
- **`tenant_member`** (1C/1H/2M/1L) — **Cross-tenant IDOR risk**: tenant-scoped PK lookups trust the caller and rely on a route-layer post-check instead of an in-service `tenantId` filter.

> Four of the five are **cross-tenant IDOR** patterns — a tenant entity (or child row) read/written without an in-service `tenantId` predicate, exploitable in shared-DB mode. `e_signature` is an **SSRF** exposure on outbound trust-list/OCSP fetches. See each module's POSTURE.md for line-level evidence.

## Systemic findings (cross-cutting patterns)
Approximate prevalence across the 57 reviewed modules (derived from per-module flags):

| # | Pattern | ~Modules | Rule | Fix direction |
| --- | --- | :---: | --- | --- |
| 1 | **Services throw raw `new Error(Messages.X)` instead of `AppError`** — route handlers cannot derive an HTTP status, so 4xx conditions collapse to 500. | ~52/57 | `error-handling-and-app-error.md` | `throw new AppError(msg, status, ErrorCode.X)` from `@/modules/common/app-error`. |
| 2 | **No in-service audit log on sensitive mutations** (money moves, credential/cert/domain/invitation changes); only webhooks/usage rows. | ~37/57 | `logging-monitoring-and-audit-trails.md` | Fire-and-forget `AuditLogService.log(...)` on state transitions. |
| 3 | **Resource-level authz enforced at the route layer, not in the service** (services trust the `tenantId` argument). | ~35/57 | `authorization-and-rbac.md` | Add an in-service ownership/role check, or document the route as the trust boundary. Becomes **Critical** when the `tenantId` filter is actually missing (see grade D). |
| 4 | **Multi-write sequences not wrapped in a transaction** — partial-state / race risk. | ~31/57 | `database-patterns.md` | Wrap check-then-write and multi-save flows in a transaction. |
| 5 | **Hardcoded user-facing strings / no `<module>.messages.ts`.** | ~26/57 | `module-messages-pattern.md` | Move prose to a messages source; reference by key. |
| 6 | **Direct `process.env.X` reads inside services** instead of `@/modules/env`. | ~23/57 | `env-and-config.md` | Read config from the Zod-validated `env` module. |
| 7 | **DB/provider output returned without a `Safe*Schema` gate** (often via `as any`), risking sensitive-column leakage. | ~12/57 | `validation-philosophy.md` | Parse outputs through the module's `Safe*Schema` before returning. |
| 8 | **Raw SQL** (`auth` dormant-account sweep) / **non-cryptographic `Math.random()`** for MFA backup codes (`auth`). | 2 each | `database-patterns.md`, `security-hardening.md` | Use the query builder; use `crypto.randomInt`. |

## All modules
| Module | Grade | C / H / M / L | Top issue |
| --- | :---: | :---: | --- |
| [e_signature](../modules/e_signature/POSTURE.md) | D | 1 / 4 / 4 / 2 | Raw `throw new Error(...)` used in every service instead of AppError + ErrorCode (Dimension 3, High) —… |
| [tenant_invitation](../modules/tenant_invitation/POSTURE.md) | D | 1 / 4 / 3 / 1 | Tenant-scoped TenantInvitation entity read off the system DataSource (getDataSource) in… |
| [tenant_domain](../modules/tenant_domain/POSTURE.md) | D | 1 / 3 / 7 / 2 | Cross-tenant IDOR: by-id reads/mutations… |
| [payment_sell](../modules/payment_sell/POSTURE.md) | D | 1 / 2 / 4 / 3 | Raw `new Error()` thrown instead of `AppError` across all failure paths (11 sites in both services) —… |
| [tenant_member](../modules/tenant_member/POSTURE.md) | D | 1 / 1 / 2 / 1 | Tenant-scoped PK lookups (getById/update/delete) trust the caller and rely on a route-layer… |
| [payment_tax](../modules/payment_tax/POSTURE.md) | C | 0 / 4 / 4 / 1 | Dim 3: every service throw is a raw `new Error(...)` (no AppError/ErrorCode) — routes cannot map HTTP status |
| [auth](../modules/auth/POSTURE.md) | C | 0 / 3 / 4 / 2 | Pervasive raw `throw new Error(AuthMessages.X)` across all six services instead of AppError with… |
| [payment](../modules/payment/POSTURE.md) | C | 0 / 3 / 4 / 2 | Pervasive raw throw new Error instead of AppError+ErrorCode across all 7 services (Dimension 3, High). |
| [user_session](../modules/user_session/POSTURE.md) | C | 0 / 3 / 4 / 2 | Raw `throw new Error(...)` instead of AppError across all failure paths (Dim 3) — pervasive in crud +… |
| [store](../modules/store/POSTURE.md) | C | 0 / 2 / 5 / 0 | Dimension 3: all four services throw raw new Error(...) instead of AppError with statusCode + ErrorCode… |
| [media_gallery](../modules/media_gallery/POSTURE.md) | C | 0 / 2 / 4 / 1 | Raw `throw new Error(...)` instead of `AppError` (Dim 3) at service lines 90/110/127 — routes cannot… |
| [storage](../modules/storage/POSTURE.md) | C | 0 / 2 / 4 / 1 | Raw `throw new Error` instead of AppError in service (Dimension 3) — surfaces as generic 500, route cannot… |
| [tenant_subscription](../modules/tenant_subscription/POSTURE.md) | C | 0 / 2 / 4 / 1 | Pervasive raw `throw new Error(...)` instead of AppError across all six services (46 occurrences) — no… |
| [user_security](../modules/user_security/POSTURE.md) | C | 0 / 2 / 4 / 1 | Pervasive raw `throw new Error(...)` in both services instead of AppError + ErrorCode (Dimension 3) —… |
| [webhook](../modules/webhook/POSTURE.md) | C | 0 / 2 / 4 / 1 | Raw `throw new Error(WebhookMessages.X)` on every not-found path across webhook.service.ts and… |
| [scim](../modules/scim/POSTURE.md) | C | 0 / 2 / 3 / 1 | Raw new Error(...) with monkey-patched (err as any).status/.scimType instead of AppError on every error… |
| [user](../modules/user/POSTURE.md) | C | 0 / 2 / 3 / 2 | Raw throw new Error(...) instead of AppError across all 7 failure paths — routes cannot derive HTTP status… |
| [ai](../modules/ai/POSTURE.md) | C | 0 / 2 / 2 / 2 | AIError extends Error but is thrown with statusCode omitted (undefined) at three sites, so route handlers… |
| [order_fulfillment](../modules/order_fulfillment/POSTURE.md) | C | 0 / 2 / 2 / 2 | Dimension 3 (raw Error vs AppError): all 6 throws in the service use raw new Error() — route handlers… |
| [user_social_account](../modules/user_social_account/POSTURE.md) | C | 0 / 2 / 2 / 1 | Raw `throw new Error(...)` inside services instead of AppError with statusCode + ErrorCode (lines 77, 111)… |
| [notification_mail](../modules/notification_mail/POSTURE.md) | C | 0 / 1 / 5 / 2 | No notification_mail.messages.ts: every email subject is a hardcoded inline string across both template… |
| [payment_return_rma](../modules/payment_return_rma/POSTURE.md) | C | 0 / 1 / 5 / 1 | Pervasive raw `throw new Error(Messages.X)` instead of AppError with statusCode+ErrorCode (7 sites) —… |
| [dynamic_page](../modules/dynamic_page/POSTURE.md) | C | 0 / 1 / 4 / 1 | Raw `throw new Error(DynamicPageMessages.X)` at all 16 throw sites instead of AppError with… |
| [invoice](../modules/invoice/POSTURE.md) | C | 0 / 1 / 4 / 1 | Dimension 3: raw `new Error(InvoiceMessages.X)` thrown in every failure path of both services instead of… |
| [payment_cart](../modules/payment_cart/POSTURE.md) | C | 0 / 1 / 4 / 1 | Pervasive raw `throw new Error(PAYMENT_CART_MESSAGES.X)` (14 sites) instead of AppError with… |
| [payment_shipping](../modules/payment_shipping/POSTURE.md) | C | 0 / 1 / 4 / 2 | Pervasive raw `throw new Error(MESSAGES.X)` in a service layer instead of `AppError` with statusCode +… |
| [product_review](../modules/product_review/POSTURE.md) | C | 0 / 1 / 4 / 2 | Dimension 3: every service throw is a raw `new Error(...)` instead of `AppError` with statusCode +… |
| [redis_idempotency](../modules/redis_idempotency/POSTURE.md) | C | 0 / 1 / 4 / 0 | Cache key derived from client-supplied Idempotency-Key header with no tenant namespace (cross-tenant… |
| [user_profile](../modules/user_profile/POSTURE.md) | C | 0 / 1 / 4 / 1 | Six raw `throw new Error(...)` inside the service instead of AppError with statusCode+ErrorCode (High,… |
| [auth_sso](../modules/auth_sso/POSTURE.md) | C | 0 / 1 / 3 / 1 | Raw `throw new Error(...)` instead of AppError across 5 throw sites — route layer cannot derive HTTP… |
| [coupon](../modules/coupon/POSTURE.md) | C | 0 / 1 / 3 / 2 | Dimension 3: every service throw is a raw new Error(COUPON_MESSAGES.X) — no AppError/statusCode/ErrorCode… |
| [payment_loyalty_points](../modules/payment_loyalty_points/POSTURE.md) | C | 0 / 1 / 3 / 2 | Five raw `throw new Error(MESSAGES.X)` inside the service instead of AppError with statusCode+ErrorCode… |
| [payment_subscription](../modules/payment_subscription/POSTURE.md) | C | 0 / 1 / 3 / 1 | Dimension 3 — every service failure path throws raw new Error(...) instead of AppError + ErrorCode, so all… |
| [tenant_session](../modules/tenant_session/POSTURE.md) | C | 0 / 1 / 3 / 1 | raw `throw new Error(...)` instead of AppError across the entire authz primitive (9 sites: lines… |
| [user_preferences](../modules/user_preferences/POSTURE.md) | C | 0 / 1 / 3 / 1 | Raw throw new Error(...) in a service instead of AppError (Dimension 3) — prevents route handlers from… |
| [api_key](../modules/api_key/POSTURE.md) | C | 0 / 1 / 2 / 0 | Raw `throw new Error(ApiKeyMessages.*)` used at all 12 error sites instead of AppError with statusCode +… |
| [auth_impersonation](../modules/auth_impersonation/POSTURE.md) | C | 0 / 1 / 2 / 1 | Raw `throw new Error(...)` inside a service instead of AppError with statusCode + ErrorCode (Dimension 3,… |
| [auth_saml](../modules/auth_saml/POSTURE.md) | C | 0 / 1 / 2 / 3 | Dimension 3: services throw raw `new Error(Messages.X)` instead of `AppError` with statusCode/ErrorCode —… |
| [exchange_rate](../modules/exchange_rate/POSTURE.md) | C | 0 / 1 / 2 / 1 | Service throws raw new Error(...) on every failure path instead of AppError with statusCode + ErrorCode… |
| [payment_wishlist](../modules/payment_wishlist/POSTURE.md) | C | 0 / 1 / 2 / 1 | Pervasive raw throw new Error(...) instead of AppError across all 12 failure paths (no AppError/ErrorCode… |
| [setting](../modules/setting/POSTURE.md) | C | 0 / 1 / 2 / 1 | Raw throw new Error inside a service instead of AppError (Dimension 3) — prevents route handlers from… |
| [tenant](../modules/tenant/POSTURE.md) | C | 0 / 1 / 2 / 3 | Raw throw new Error inside services instead of AppError with statusCode + ErrorCode (4 occurrences) —… |
| [notification_push](../modules/notification_push/POSTURE.md) | B | 0 / 0 / 4 / 2 | Push secret material (p256dh/auth) leaves the service boundary unredacted: returned as raw entity from… |
| [tenant_usage](../modules/tenant_usage/POSTURE.md) | B | 0 / 0 / 4 / 2 | Redis read paths (getUsage/flushToDb) do not fail open — raw ioredis errors propagate status-less to callers |
| [audit_log](../modules/audit_log/POSTURE.md) | B | 0 / 0 / 3 / 1 | DTO .parse() (not safeParse) at the service boundary throws raw ZodError with no AppError mapping |
| [limiter](../modules/limiter/POSTURE.md) | B | 0 / 0 / 3 / 2 | Loose exported functions instead of the static-class + single-default-export convention; module.json… |
| [notification_inapp](../modules/notification_inapp/POSTURE.md) | B | 0 / 0 / 3 / 1 | Dimension 2: store output cast (JSON.parse) instead of validated through existing NotificationSchema.safeParse |
| [redis](../modules/redis/POSTURE.md) | B | 0 / 0 / 3 / 1 | Infrastructure module is a singleton/factory, not a static service class (Dim 1) — deliberate deviation… |
| [user_agent](../modules/user_agent/POSTURE.md) | B | 0 / 0 / 3 / 2 | External network boundary (ip-api.com response) consumed as untyped any despite an existing… |
| [seo](../modules/seo/POSTURE.md) | B | 0 / 0 / 2 / 2 | Write-only-delete cache: get() relies on singleFlight (in-process dedup only,… |
| [tenant_branding](../modules/tenant_branding/POSTURE.md) | B | 0 / 0 / 2 / 0 | No audit logging on tenant-scoped mutations (update/reset) — fire-and-forget audit trail missing |
| [tenant_export](../modules/tenant_export/POSTURE.md) | B | 0 / 0 / 2 / 2 | Deny-list (stripFields) instead of Safe*Schema allow-list for DB output — silent leak on next schema migration |
| [logger](../modules/logger/POSTURE.md) | B | 0 / 0 / 1 / 1 | No secret/PII redaction in the central logging primitive: serialize() JSON.stringify's arbitrary objects,… |
| [notification_log](../modules/notification_log/POSTURE.md) | B | 0 / 0 / 1 / 3 | No Safe*Schema projection on DB output (raw entities incl. free-text error column returned) |
| [notification_sms](../modules/notification_sms/POSTURE.md) | B | 0 / 0 / 1 / 2 | Service throws no AppError/ErrorCode anywhere (uses re-throw of underlying errors); a route handler cannot… |
| [env](../modules/env/POSTURE.md) | A | 0 / 0 / 0 / 1 | z.coerce.boolean() footgun: non-empty strings including "false" and "0" coerce to true; only unset/empty… |
| [observability](../modules/observability/POSTURE.md) | A | 0 / 0 / 0 / 2 | Typed-trust facade: methods consume route-validated typed inputs rather than calling safeParse in-service… |

## How to read a `POSTURE.md`
Each file has: a header (grade + finding counts), a **Service Inventory**, **Findings** grouped by severity (🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low) with `path:line` evidence + the violated rule + a concrete fix, a **13-row Rule Compliance Matrix** (✅/⚠️/❌/—), prioritized **Recommendations**, and **References**.

The 13 audit dimensions: 1) static service class · 2) boundary validation (Zod + Safe output) · 3) error handling (AppError) · 4) messages pattern · 5) DB access & entity ownership · 6) multi-tenancy · 7) authorization/RBAC · 8) service composition & boundaries · 9) caching · 10) secrets & config · 11) logging & audit · 12) security hardening · 13) naming & file organization.

_This is a documentation-only audit; no service code was changed._
