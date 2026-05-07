# Boilerplate Roadmap

Coverage key: ✅ Covered · 🟡 Partial · ❌ Missing  
Priority key: 🔴 Must-have · 🟠 Should-have · 🟢 Nice-to-have

---

## Authentication & Identity

### 1. Tenant-Scoped JWT Claims
- **Description:** Every JWT issued inside a tenant context must include `tenantId`, `memberId`, and `role` as verified claims.
- **Why:** Without scoped claims, a token from tenant A can be replayed against tenant B's API if only `userId` is checked.
- **Implementation:** In `app/tenant/[tenantId]/api/auth/session/token-set/route.ts` — sign a short-lived tenant JWT (15min) alongside the system JWT. Tenant API middleware validates `tenantId` claim matches the URL param before touching any DB.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `TenantSessionNextService.authenticateTenantByRequest` validates role via DB lookup on every request. It works but not via embedded JWT claims — a DB hit on every tenant API call instead of stateless token verification.

---

### 2. Session Invalidation on Role Change
- **Description:** When a `TenantMember`'s role is changed or they are removed, all their active tenant sessions must be invalidated immediately.
- **Why:** A demoted admin keeps admin-level JWT until it expires naturally — up to hours.
- **Implementation:** In `modules/tenant_member/` PATCH handler, increment a `sessionVersion` int on the `TenantMember` row. Tenant middleware checks `JWT.sessionVersion === member.sessionVersion` and rejects stale tokens.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — no `sessionVersion` field on `TenantMember`, no invalidation mechanism on role/status change.

---

### 3. Two-Factor Enforcement Policy
- **Description:** Tenant admins can require all members to have 2FA enabled. Members without it are shown a gate on login until they set it up.
- **Why:** Enterprise customers require this. Without it, a single weak password in the org compromises the tenant.
- **Implementation:** Add `require2fa: Boolean` to `modules/tenant_setting/entities/`. In tenant session middleware, check `member.user.totpEnabled` when `tenantSettings.require2fa` is true. Return `403 TOTP_REQUIRED` if not met.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — TOTP exists for users, but no tenant-level enforcement setting or gate.

---

### 4. SSO Enforcement (Force SAML)
- **Description:** Tenant setting that disables password login and OTP for that tenant — only SAML/SSO allowed.
- **Why:** Regulated enterprise tenants require that all auth flows through their IdP.
- **Implementation:** Add `ssoEnforced: Boolean` to tenant settings. In `app/tenant/[tenantId]/api/auth/login/`, check this flag first and return `403 SSO_ENFORCED` with redirect URL to SAML initiate endpoint.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — SAML module is complete (`initiate`, `callback`, `metadata`, `config`) but no `ssoEnforced` flag, no gate in the login handler.

---

### 5. Super Admin Impersonation Audit Trail
- **Description:** Every impersonation session must be logged with: who impersonated, which tenant/user, reason, start timestamp, end timestamp, and every mutating API call made during the session.
- **Why:** Impersonation is a privileged action. Without a trail, there's no accountability for data accessed or changed.
- **Implementation:** In `modules/auth_impersonation/`, add `ImpersonationSession` entity with `reason`, `startedAt`, `endedAt`, `actionsLog: Json`. Audit log middleware must tag requests with `impersonatedBy: userId`.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `IMPERSONATION_STARTED` / `IMPERSONATION_ENDED` audit actions exist and are logged. `impersonatorUserId` is stored in session metadata. Missing: `reason` field, per-action logging during the session, duration tracking.

---

## Tenant Isolation

### 6. Tenant-Aware Prisma Query Middleware
- **Description:** A Prisma client extension that automatically appends `where: { tenantId }` to every query on tenant-scoped models.
- **Why:** Manual `tenantId` filtering in every service is a human error problem. One missed filter = cross-tenant data leak.
- **Implementation:** Use Prisma Client Extensions (`$extends`) to create a `tenantPrisma(tenantId)` factory. Every tenant API route calls this factory instead of raw `prisma`. Models without `tenantId` (e.g. `User`) are not wrapped.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — all services manually filter by `tenantId`. No `$extends` factory. Each service is a potential cross-tenant leak if a `where` clause is forgotten.

---

### 7. Tenant Subdomain Resolver Middleware
- **Description:** Maps `acme.app.com` → `tenantId` by looking up the slug in DB/cache before routing hits Next.js.
- **Why:** Current routing uses `/tenant/[tenantId]` path params. Production SaaS uses subdomains. Without a resolver, `customer.yourapp.com` is not possible.
- **Implementation:** In Next.js root `middleware.ts`, match `*.app.com` hostnames, lookup `TenantDomain` by slug, rewrite to `/tenant/[tenantId]/...` internally. Cache slug→id mapping in Redis with 5min TTL.
- **Priority:** 🟠 Should-have
- **Coverage:** 🟡 Partial — `extractTenantId(request, 'subdomain')` utility exists in `TenantSessionNextService`. However, there is no root `middleware.ts` that intercepts all requests and rewrites subdomain→tenantId automatically.

---

### 8. Per-Tenant Redis Key Namespace
- **Description:** All Redis keys for tenant-scoped data use the prefix `tenant:{tenantId}:*`.
- **Why:** Without namespacing, rate limit counters, cache entries, and session data from different tenants collide.
- **Implementation:** Create a `getTenantRedis(tenantId)` wrapper that prefixes all key operations. Apply to: rate limiters, session stores, feature flag caches, and job queues.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — domain module correctly uses `tenant:domain:*` keys. The IP-based rate limiter (`rate_limit:scope:ip`) has no tenant prefix. AI service uses a separate prefix pattern. Inconsistent across modules.

---

### 9. Custom Domain Verification Workflow
- **Description:** Tenant adds a custom domain → system generates a DNS TXT record → tenant adds it → verification job checks DNS propagation.
- **Why:** Domains added without verification can be used to hijack traffic meant for another tenant.
- **Implementation:** In `app/tenant/[tenantId]/api/domains/[domainId]/verify/`, use `dns.promises.resolveTxt()`. Store verification token in `TenantDomain.verificationToken`. Schedule a background re-check every 10min for 48h.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `DNSVerificationService` with TXT and CNAME methods, Redis token storage (24h TTL), `dns/promises` resolver, both verification paths implemented.

---

### 10. Tenant Deletion Workflow
- **Description:** Multi-step tenant deletion: request → 30-day scheduled deletion → data archival → permanent purge.
- **Why:** Immediate deletion is dangerous (accidental deletes, legal holds). Data must be purged in the correct order to avoid FK violations.
- **Implementation:** Add `deletionRequestedAt`, `deleteAfter`, `deletedAt` to `Tenant`. Deletion order: cancel subscription → revoke API keys → archive storage files → anonymize audit logs → delete DB rows. CRON job runs daily, deletes tenants where `deleteAfter < now`.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — `TENANT_DELETED` audit action and `DELETE /system/api/tenants/[tenantId]` exist. No `deletionRequestedAt` / `deleteAfter` fields, no staged workflow, no CRON purge.

---

### 11. Tenant Data Export (GDPR Art. 20)
- **Description:** Tenant admin can request a full data export — all members, settings, audit logs, stored files — as a ZIP download.
- **Why:** GDPR data portability is a legal requirement in EU. Enterprise customers ask for this before signing.
- **Implementation:** POST to `/api/export` enqueues a background job. Job serializes all tenant-scoped Prisma models to JSON, zips with stored files, uploads to private storage, sends download link via email. Link expires in 24h.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no export endpoint, no export module, no job.

---

## Billing & Subscriptions

### 12. Subscription Seat Limit Enforcement
- **Description:** When inviting a new member, check current member count against the plan's seat limit. Reject with `402 SEAT_LIMIT_REACHED` if exceeded.
- **Why:** Without enforcement, tenants can exceed their paid seat count indefinitely.
- **Implementation:** In `app/tenant/[tenantId]/api/invitations/`, before creating an invitation: query `COUNT(TenantMember WHERE tenantId)`, compare to `Plan.features[seats]`. Use a DB transaction with `SELECT FOR UPDATE` to prevent race conditions.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `MAX_MEMBERS` and `MAX_INVITATIONS` feature keys exist. `checkFeature()` in subscription service supports `currentCount`, grace percent, and returns `{ allowed, limit, current }`.

---

### 13. Usage Metering Per Tenant
- **Description:** Track per-tenant consumption of metered resources: API calls, AI tokens, storage bytes, email sends. Enforce plan limits.
- **Why:** Unlimited usage on a fixed-price plan destroys margins. You need a usage record to bill overages or enforce limits.
- **Implementation:** Add `TenantUsage { tenantId, month, apiCalls, aiTokens, storageBytes }`. Increment counters in Redis with `INCR tenant:{id}:usage:apiCalls`, flush to DB hourly. Check limits in relevant service layers, return `429 QUOTA_EXCEEDED`.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `MAX_AI_REQUESTS` and `STORAGE_GB` feature keys are defined. Plan feature check infrastructure exists. No `TenantUsage` table, no counter increment on API calls, no flush-to-DB job.

---

### 14. Subscription Trial Period
- **Description:** New tenants get N free days before billing starts. Trial expiry sends reminder emails at D-7, D-3, D-1.
- **Why:** Free trials are the primary acquisition mechanism for SaaS. Without this, you can't offer one without manual provisioning.
- **Implementation:** `trialEndsAt: DateTime` on `TenantSubscription`. In subscription middleware, check `trialEndsAt > now` before checking payment status. CRON checks trials expiring in 1/3/7 days and dispatches reminder emails.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `trialDays` on plan, `trialEndsAt` on subscription, `TRIALING` status all confirmed. Missing: trial expiry reminder emails, CRON-based trial-to-expired transition.

---

### 15. Grace Period Enforcement After Payment Failure
- **Description:** After a failed payment, tenant gets X-day grace period. During grace: service works but shows warning banner. After grace: API returns `402 SUBSCRIPTION_REQUIRED`.
- **Why:** Immediate lockout on payment failure causes customer panic and churn.
- **Implementation:** In tenant API middleware, check `subscription.status === 'past_due'` and `subscription.graceEndsAt`. If past grace, return 402. If in grace, set response header `X-Grace-Warning: true` which the frontend reads to show the banner.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `/api/subscription/grace-period` endpoint and `graceEndsAt` on subscription entity exist. No confirmed middleware gate that enforces 402 after grace expires on all tenant API routes.

---

### 16. Plan Upgrade / Downgrade with Proration
- **Description:** Tenant can change plans mid-billing cycle. Unused days on old plan are credited, new plan charges prorated remainder.
- **Why:** Without proration, customers avoid upgrading mid-cycle or get double-charged.
- **Implementation:** Delegate to payment provider for Stripe (automatic). For Iyzico/PayPal: calculate proration manually. Store `pendingPlanId` on `TenantSubscription`, apply at next billing cycle if immediate proration isn't supported.
- **Priority:** 🟠 Should-have
- **Coverage:** 🟡 Partial — Stripe, PayPal, and Iyzico providers exist. Subscription update endpoint exists. No proration calculation logic confirmed for non-Stripe providers.

---

### 17. Subscription Cancellation Flow with Offboarding
- **Description:** Cancellation captures a reason, optionally offers a discount, schedules end-of-period cancellation (not immediate), and triggers an offboarding email sequence.
- **Why:** Cancellation without reason capture misses retention data. Immediate cancellation when customer clicks cancel is bad UX.
- **Implementation:** Add `cancellationReason`, `cancelAt` (end of period) to `TenantSubscription`. POST `/api/subscription/cancel` accepts `{ reason, feedback }`. Dispatch cancellation email with data export link.
- **Priority:** 🟠 Should-have
- **Coverage:** 🟡 Partial — `cancelledAt` on subscription entity, `subscription.cancelled` webhook event and audit action exist. Missing: `cancellationReason`, `cancelAt` (schedule vs. immediate), discount offer, offboarding email.

---

### 18. Public Pricing Page from DB
- **Description:** A public `/pricing` route renders plan comparison from live DB data — no hardcoded prices in JSX.
- **Why:** Hardcoded pricing pages fall out of sync with actual plan data. Changing a plan requires a code deploy.
- **Implementation:** Use `/system/api/subscriptions/plans/public` to fetch plans + features. Render as a comparison table with feature matrix. Cache with `stale-while-revalidate`.
- **Priority:** 🟠 Should-have
- **Coverage:** 🟡 Partial — `/system/api/subscriptions/plans/public` API exists. No `/pricing` UI page in the route list.

---

## Roles & Permissions

### 19. Permission Check Helper Layer
- **Description:** A single `assertPermission(memberId, tenantId, action)` function used in every tenant API route — not inline `if role === 'ADMIN'` checks scattered across handlers.
- **Why:** Inline role checks are duplicated, inconsistent, and easy to forget. A central helper is auditable and testable.
- **Implementation:** `modules/tenant_member/permissions.ts` with an `RBAC_POLICY` map: `{ 'invitations:create': ['OWNER', 'ADMIN'] }`. `assertPermission` throws `403 FORBIDDEN` with the action name on failure.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `auth.scopes.ts` has a typed scope-to-role map. `TenantSessionNextService.authenticateTenantByRequest` accepts `requiredTenantRole` and `requiredScopes[]`. Central, reusable, and applied consistently.

---

### 20. Custom Tenant Roles
- **Description:** Tenant admins can define custom roles beyond `OWNER / ADMIN / MEMBER` and assign fine-grained permissions to each.
- **Why:** Enterprise tenants have complex org structures. A "billing manager" or "read-only viewer" doesn't map to default roles.
- **Implementation:** Add `TenantRole { id, tenantId, name, permissions: String[] }` and `TenantMember.customRoleId`. Permission check layer resolves permissions from either built-in role OR custom role's `permissions[]` array.
- **Priority:** 🟢 Nice-to-have
- **Coverage:** ❌ Missing — `memberRole` is a plain `varchar` with fixed built-in values. No `TenantRole` entity or custom role concept.

---

## API Layer

### 21. Machine-Readable Error Codes
- **Description:** Every API error response returns a structured `{ code: string, message: string, details?: object }` — never just an HTTP status.
- **Why:** Frontend and third-party integrators need to branch on specific error codes, not guess from status codes. `402` alone doesn't tell you `SEAT_LIMIT_REACHED` vs `SUBSCRIPTION_EXPIRED`.
- **Implementation:** Create `lib/api-error.ts` with a typed `ApiError` class and an exhaustive enum of error codes. All route handlers catch `ApiError` and serialize it. Document codes in the API docs module.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — errors are thrown as plain strings caught by generic handlers. No typed `{ code, message }` response envelope across the API surface.

---

### 22. API Key Scopes
- **Description:** API keys have a `scopes: String[]` field. Each route declares required scope. Requests with keys missing the scope are rejected with `403 INSUFFICIENT_SCOPE`.
- **Why:** Full-access API keys are a security liability. Integrations should only get the permissions they need.
- **Implementation:** `scopes: string[]` on `ApiKey` entity. In API key verification middleware at `app/tenant/[tenantId]/api/api-keys/verify/`, check `key.scopes.includes(requiredScope)`.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `scopes: string[]` on `ApiKey` entity, `verify(rawKey, requiredScope?)` checks scope, `ApiKeyScope` enum, `INSUFFICIENT_SCOPE` error message all confirmed.

---

### 23. API Versioning Strategy
- **Description:** All tenant and system APIs are versioned under `/api/v1/`. A version header or URL segment allows breaking changes without breaking existing integrations.
- **Why:** Without versioning, any breaking change forces all integrators to update simultaneously.
- **Implementation:** Add `X-API-Version` header support. In Next.js middleware, rewrite `/api/v1/` to current internal routes. Keep a `deprecated` flag per route with sunset headers (`Sunset: Sat, 01 Jan 2027 00:00:00 GMT`).
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no versioning strategy in routes or middleware. All paths are unversioned.

---

### 24. Webhook HMAC Signature Verification
- **Description:** Outgoing webhooks include an `X-Webhook-Signature: sha256=<hmac>` header. Delivery logs store the signature.
- **Why:** Without signatures, webhook consumers can't verify the request came from your server. Replay attacks and spoofing are trivial.
- **Implementation:** In `modules/webhook/webhook.service.ts`, compute `hmac = HMAC-SHA256(secret, body)` before each delivery. Store `signingSecret` (hashed) per webhook. Include verification docs in API doc module.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `WebhookService.signPayload(secret, body)` uses `crypto.createHmac('sha256')`. `X-Webhook-Signature` header is set on every delivery. `generateSecret()` for key creation. Fully implemented.

---

### 25. Webhook Retry with Exponential Backoff
- **Description:** Failed webhook deliveries are retried at: 1min, 5min, 15min — then marked `dead`.
- **Why:** Consumer endpoints go down temporarily. Without automatic retries, events are silently lost.
- **Implementation:** `nextRetryAt`, `retryCount`, `status: 'pending' | 'delivered' | 'failed' | 'dead'` on delivery entity. BullMQ handles retry scheduling with exponential backoff.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — BullMQ with `{ attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: 60_000 } }`. `RETRY_DELAYS_MS = [60_000, 300_000, 900_000]`. `nextRetryAt` field on delivery entity. Worker with 10 concurrent jobs.

---

## Background Processing

### 26. Background Job Queue
- **Description:** A persistent job queue (BullMQ + Redis) for async work: webhook delivery, email sending, data export, usage aggregation.
- **Why:** Running these synchronously in API routes causes timeouts, retries on re-request, and user-facing latency.
- **Implementation:** Named queues: `webhook-delivery`, `email`, `data-export`, `usage-flush`. Workers run in a separate Next.js instrumentation hook or a standalone `worker.ts` process started alongside the app.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — BullMQ is used for webhook delivery with a dedicated worker. No general-purpose queue registry. Email, data export, and usage flush are not queued.

---

### 27. CRON Job Registry with Health Monitoring
- **Description:** All scheduled jobs are registered in a central config with their schedule, last run, last success/failure, and duration.
- **Why:** Without a registry, it's impossible to know if a CRON job is silently failing or hasn't run.
- **Implementation:** Add `CronJob { name, schedule, lastRunAt, lastStatus, lastDurationMs, error }` table. Wrap every CRON handler in a `withCronTracking(name, handler)` middleware that updates this record. Expose the registry in `app/system/admin/health/`.
- **Priority:** 🟠 Should-have
- **Coverage:** 🟡 Partial — one CRON endpoint (`expire-subscriptions`) exists. No registry table, no run tracking, no health status in the admin dashboard.

---

## Observability

### 28. Tenant-Level Audit Log with Retention Policy
- **Description:** Every mutating action in a tenant is logged with actor, action, resource, old/new values. Logs are auto-purged per retention setting.
- **Why:** Enterprise customers require audit trails for compliance (SOC2, ISO 27001). Unbounded growth without retention causes DB bloat.
- **Implementation:** Add `retentionDays` to `TenantSettings` (default 90). CRON runs weekly: `DELETE FROM AuditLog WHERE tenantId = X AND createdAt < now - retentionDays`.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — comprehensive audit action enum confirmed (`member.added`, `invitation.sent`, `subscription.cancelled`, `impersonation.started`, etc.). Tenant audit log API endpoint exists. Missing: `retentionDays` on tenant settings, auto-purge CRON.

---

### 29. Real-Time Tenant Usage Dashboard
- **Description:** Tenant admin can see current month's usage: API calls, AI tokens, storage, seats — each with a progress bar against plan limits.
- **Why:** Tenants that can see their own usage self-manage better and upgrade before hitting limits rather than after.
- **Implementation:** Aggregate from `TenantUsage` table + Redis live counters. Add card-grid UI component in `app/tenant/[tenantId]/admin/subscription/`. Poll every 60s or use SSE for live updates.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no `TenantUsage` table, no usage counters, no dashboard UI for usage.

---

### 30. Super Admin Tenant Health Dashboard
- **Description:** System admin sees all tenants with health status: `active`, `trial`, `past_due`, `grace_period`, `suspended`, `pending_deletion`. Filter and sort by status.
- **Why:** Without a health view, you find out a tenant's payment failed when they email support — not proactively.
- **Implementation:** Add computed `healthStatus` to the tenant list API in `app/system/api/tenants/`. Derive from `subscription.status`, `graceEndsAt`, `deletionRequestedAt`. Show color-coded badges in `app/system/admin/tenants/`.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — tenant list UI at `app/system/admin/tenants/` exists but no `healthStatus` field, no color-coded status in the list view.

---

## Onboarding & Growth

### 31. Invitation Accept → Register → Join Flow
- **Description:** An invited user who doesn't have an account yet clicks the invite link, registers inline, and is automatically joined to the tenant — in a single flow.
- **Why:** If inviting a new user requires them to first sign up separately, most won't complete it.
- **Implementation:** `TenantInvitation` stores `inviteeEmail`. Accept endpoint checks if `User` exists. If not: return pre-filled registration URL with `?inviteToken=X`. After registration, auto-accept the invitation and redirect to tenant.
- **Priority:** 🔴 Must-have
- **Coverage:** 🟡 Partial — `invitations/accept` and `invitations/decline` endpoints exist. Invitation stores `email`. No confirmed pre-registration invite path that carries the token through registration for new users.

---

### 32. Tenant Onboarding Checklist
- **Description:** After creating a tenant, show a persistent checklist of setup tasks: invite a member, add a custom domain, configure branding, connect payment. Each item links to the relevant settings page.
- **Why:** Empty state after tenant creation leads to low activation. A guided checklist drives first-week engagement.
- **Implementation:** Create `TenantOnboardingProgress { tenantId, steps: Json }`. Steps are computed from DB state (domain exists? → domain step done). Surface as a dismissible banner/widget in `app/tenant/[tenantId]/admin/`.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no onboarding module, no checklist state, no guided setup UI.

---

### 33. Public Tenant Signup (Create Tenant on Register)
- **Description:** A public `/signup` route that creates a `User` + `Tenant` + `TenantMember(OWNER)` atomically in one DB transaction.
- **Why:** Without a combined signup flow, onboarding requires two separate steps and a manual tenant creation.
- **Implementation:** POST `/system/api/auth/register` with `{ email, password, tenantName }`. Wrap in Prisma `$transaction`. On success, return both the system auth token and the tenant ID for redirect.
- **Priority:** 🔴 Must-have
- **Coverage:** ✅ Covered — `/system/auth/create-tenant` page and `/system/api/tenants/create` endpoint both exist.

---

## Security Hardening

### 34. Tenant-Scoped Secrets Store
- **Description:** Per-tenant encrypted key-value store for tenant-owned secrets: their own Stripe keys, API credentials for third-party integrations, SMTP settings.
- **Why:** Tenants that bring their own keys need a secure place to store them. Plain JSON columns are a data breach liability.
- **Implementation:** Add `TenantSecret { tenantId, key, encryptedValue }`. Use AES-256-GCM with a per-tenant envelope key stored in env or KMS. Expose write-only via `app/tenant/[tenantId]/api/settings/` — values never returned in GET responses.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no encrypted secrets table. No write-only API for tenant secrets.

---

### 35. Tenant Isolation Test Suite
- **Description:** An automated test suite that explicitly verifies cross-tenant data isolation: tenant A cannot read tenant B's members, settings, audit logs, or invoices — even with a valid auth token.
- **Why:** Isolation bugs are silent. You won't know until a customer reports seeing another customer's data.
- **Implementation:** In `__tests__/isolation/`, create two test tenants with populated data. For every tenant-scoped API route, assert that a token from tenant A gets 403/404 (not 200) when requesting tenant B's resource IDs. Run in CI on every PR.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — no `__tests__/isolation/` directory. No cross-tenant security test suite.

---

### 36. Structured Permission Denial Logging
- **Description:** Every 403 response logs `{ userId, tenantId, action, resourceId, reason }` to the audit log — not just to stdout.
- **Why:** Without structured denial logs, you can't detect a compromised token probing resources, or identify permission bugs in production.
- **Implementation:** In the permission check helper, on failure: write to `AuditLog` with `action: 'permission.denied'` before throwing the 403. Tag as `severity: 'warning'` for alerting.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no `permission.denied` action in the audit log enum. 403 errors are thrown as plain strings.

---

### 37. Tenant-Level Rate Limiting Per Plan
- **Description:** API rate limits configured per subscription plan (e.g. Free: 100 req/min, Pro: 1000 req/min). Enforced per tenant using Redis sliding window counters.
- **Why:** A free tenant can exhaust server capacity that paid tenants depend on without per-plan limits.
- **Implementation:** Add `rateLimit` to `PlanFeature`. In tenant API middleware, read `tenant:{id}:ratelimit` from Redis (cached from plan features). Use sliding window: `ZADD + ZREMRANGEBYSCORE + ZCARD`. Return `429 RATE_LIMIT_EXCEEDED` with `Retry-After` header.
- **Priority:** 🔴 Must-have
- **Coverage:** ❌ Missing — current limiter is IP-based (`rate_limit:scope:ip`), with flat limits hardcoded in a `LIMITS` object. No per-tenant, no per-plan awareness.

---

### 38. Feature Flag Table
- **Description:** A `TenantFeatureFlag { tenantId, key, enabled, value: Json, expiresAt }` table for per-tenant feature rollouts, beta access, and kill switches — separate from subscription plan features.
- **Why:** Plan features are billing constructs. Feature flags are engineering constructs for rollout control. Mixing them makes both harder to manage.
- **Implementation:** Add the table + a `getFeatureFlag(tenantId, key)` helper that checks this table first, then falls back to plan features. Cache in Redis with 60s TTL. Super admin UI in `app/system/admin/` to toggle flags per tenant.
- **Priority:** 🟠 Should-have
- **Coverage:** ❌ Missing — no `TenantFeatureFlag` entity. Plan features (`FEATURE_KEYS`) exist but serve a different purpose.

---

## Summary

| Status | Count | Items |
|---|---|---|
| ✅ Covered | 8 | #9, #12, #19, #22, #24, #25, #33 + #14 (data model only) |
| 🟡 Partial | 13 | #1, #5, #7, #8, #13, #15, #16, #17, #18, #26, #27, #28, #31 |
| ❌ Missing | 17 | #2, #3, #4, #6, #10, #11, #20, #21, #23, #29, #30, #32, #34, #35, #36, #37, #38 |

### Critical gaps (fix before launch)

| # | Item | Risk |
|---|---|---|
| #6 | Tenant-Aware Prisma Middleware | Cross-tenant data leak if any service forgets a `where` clause |
| #35 | Tenant Isolation Test Suite | No automated proof that isolation holds |
| #37 | Tenant-Level Rate Limiting | Free tenants can starve paid tenants |
| #21 | Machine-Readable Error Codes | Integrators can't reliably handle errors |
| #2 | Session Invalidation on Role Change | Demoted admins keep elevated access until JWT expires |
