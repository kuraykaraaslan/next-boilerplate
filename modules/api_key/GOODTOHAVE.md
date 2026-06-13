# Good to Have — API Key Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## ✅ Shipped (no mock)

- **Resource-level scopes** — keys may hold `resource:action` scopes
  (`invoices:read`, `orders:*`); `scopeSatisfies()` enforces the hierarchy
  (`admin`/`*` ⊇ all, `write` ⊇ `read`, `resource:write` ⊇ `resource:read`).
- **Per-plan scope allowlist** — `apiKeyAllowedScopes` caps what scopes a tenant
  may mint; `create()` rejects out-of-plan scopes (`SCOPE_NOT_ALLOWED`).
- **IP allowlist (per key + per tenant)**, **max active key count**, **max TTL /
  required expiry**, **zero-downtime rotation**, **emergency revoke-all**,
  **failed-verification audit**, **dormant-key anomaly detection**, and the
  **expiry sweep** were already implemented in `api_key.service.ts`.
- **Rotation reminders** — `sweepExpiringSoon()` emits `api_key.expiring`
  (deduped per key per day) for keys nearing expiry.

---

## Scope & Permission Granularity

### ✅ Resource-Level Scopes
**Why:** Current scopes (`read`, `write`, `admin`, `scim:read`, `scim:write`) are coarse; a key with `write` scope can write to any resource (members, settings, webhooks, AI calls), making least-privilege impossible for third-party integrations.
**Complexity:** Medium
**Multi-tenant relevance:** Tenants granting partner integrations a key need to limit access to a specific resource type (e.g. `members:read`, `webhooks:write`) without exposing unrelated endpoints.
**Multi-country relevance:** PSD2 (EU), Open Banking (UK), and similar regulated-API frameworks mandate fine-grained scope declarations in tokens used for third-party data access.

### ✅ Per-Plan Scope Allowlist
**Why:** Any tenant with `feature_api_keys` can mint keys with `admin` or `scim:write` scope regardless of plan tier; there is no per-plan restriction on which scopes are grantable.
**Complexity:** Low
**Multi-tenant relevance:** Starter-plan tenants should be limited to `read`/`write`; `admin` and `scim:*` scopes should be reserved for enterprise plans as a plan-differentiation lever.
**Multi-country relevance:** Regulated markets may restrict which scopes can be delegated to third parties depending on the tenant's certification level (e.g. FCA authorization in the UK for Open Banking).

### Scope Inheritance / Role Mapping
**Why:** There is no mapping between API-key scopes and the platform's tenant-role model (ADMIN, MEMBER, etc.); a key's effective permissions must be manually enforced at every route layer with no central policy.
**Complexity:** High
**Multi-tenant relevance:** Consistent RBAC enforcement across both session-based and API-key-based access paths reduces the attack surface for privilege-escalation bugs in tenant routes.
**Multi-country relevance:** GDPR access-control audits require demonstrable mapping between credentials and the data categories they can access; a scope-to-role mapping makes this auditable.

---

## Key Lifecycle Management

### ✅ Automatic Expiry Enforcement & Rotation Reminders
**Why:** `expiresAt` is stored but the service performs a point-in-time check at `verify` time only; there is no background job that auto-deactivates expired keys or notifies key owners before expiry.
**Complexity:** Medium
**Multi-tenant relevance:** Keys left active after their conceptual expiry (the owner forgot to rotate them) are a security risk for every tenant; automated enforcement removes human error from the lifecycle.
**Multi-country relevance:** ISO 27001 and SOC 2 certifications (required for enterprise sales in many markets) mandate documented credential rotation policies with automated enforcement.

### ✅ Maximum Active Key Count per Tenant / Plan
**Why:** `create` places no count limit; a tenant can mint an unlimited number of keys, which can exhaust the platform's negative-cache Redis memory and create an unmanageable attack surface.
**Complexity:** Low
**Multi-tenant relevance:** Per-plan key count limits are a natural tier-differentiation feature (e.g. Starter: 5 keys, Pro: 50 keys, Enterprise: unlimited).
**Multi-country relevance:** No direct country dimension, but key count limits reduce credential-stuffing exposure — a relevant defence in regions with high automation-attack rates.

### ✅ Forced Expiry / Maximum Key TTL per Tenant
**Why:** There is no per-tenant policy that caps the maximum `expiresAt` a key can be given (today `null` = never expires); compliance frameworks require credentials to have a bounded lifetime.
**Complexity:** Low
**Multi-tenant relevance:** Enterprise tenants under internal security policies may need to enforce that no key survives beyond N days; the platform should enforce this as a tenant-level setting.
**Multi-country relevance:** NIS2 (EU), UK Cyber Essentials, and Australian IRAP controls prescribe maximum credential lifetimes; supporting per-tenant TTL caps aids certification for tenants in those jurisdictions.

### ✅ Key Rotation Workflow (Successor Key Pattern)
**Why:** Revoking a key is destructive — the caller must atomically issue a new key and update all consumers. There is no first-class rotate API that mints a successor key and sets a grace-period on the old one.
**Complexity:** Medium
**Multi-tenant relevance:** CI/CD pipelines and integrations need zero-downtime rotation; a grace-period window prevents outages during the transition.
**Multi-country relevance:** Regulated industries (finance, healthcare) across jurisdictions require auditable, zero-downtime credential rotation without service disruption.

---

## IP & Network Restrictions

### ✅ IP Allowlist per API Key
**Why:** Any holder of a valid raw key from any IP address can authenticate; there is no mechanism to restrict a key to a declared set of IP CIDRs.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants running server-to-server integrations from fixed infrastructure (data centers, NAT gateways) can dramatically reduce their attack surface with IP pinning.
**Multi-country relevance:** Data sovereignty requirements may mandate that API access from outside a specific country/region be blocked at the credential level, not just at the network perimeter.

### ✅ IP Allowlist per Tenant (Global Default)
**Why:** Beyond per-key IP restrictions, a tenant-wide default IP allowlist (applied to all keys unless overridden) would protect tenants that always access from a known network.
**Complexity:** Low
**Multi-tenant relevance:** Provides a single-point-of-control for network-based access policy without requiring every key to be individually configured.
**Multi-country relevance:** Country-level blocking requirements (e.g. sanctions compliance — OFAC, EU sanctions) can be implemented at this layer for certain tenant deployments.

---

## Security & Threat Defence

### ✅ Failed Verification Audit Logging
**Why:** `verify` throws on invalid/expired/insufficient-scope keys but never writes an audit-log entry; credential-stuffing and scope-escalation attempts are invisible to tenant admins and the platform security team.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins need visibility into failed authentication attempts against their tenant's endpoints so they can detect and respond to attacks.
**Multi-country relevance:** Breach notification laws (GDPR Art. 33, Australian Privacy Act) require organizations to detect and report unauthorized access attempts; an audit trail is the detection prerequisite.

### ✅ Key Usage Anomaly Detection
**Why:** `lastUsedAt` is updated fire-and-forget but there is no rate counter or anomaly signal (e.g. burst of requests from a new IP, sudden spike after long dormancy) that would alert a tenant to a possibly compromised key.
**Complexity:** High
**Multi-tenant relevance:** Compromised keys silently drain a tenant's quota and access their data; behavioral anomaly signals give tenant admins actionable alerts before significant damage occurs.
**Multi-country relevance:** GDPR Article 32 requires appropriate technical measures to detect security incidents; anomaly detection on credential usage is a direct implementation of that obligation.

### ✅ Key Compromise / Emergency Revoke All Endpoint
**Why:** There is no admin operation to instantly revoke all active keys for a tenant (e.g. on suspicion of a breach); each key must be deleted individually via N API calls.
**Complexity:** Low
**Multi-tenant relevance:** A single emergency endpoint that deactivates all keys and clears all cache entries is essential for incident response at the tenant level.
**Multi-country relevance:** GDPR breach response timelines (72 hours to notify) and equivalent laws require fast containment; mass-revocation must be an atomic, instant operation.

### Key Prefix by Environment (`sk_live_` / `sk_test_`)
**Why:** All keys use the `sk_live_` prefix regardless of whether the platform is running in production, staging, or development mode; test keys can be used in production and vice versa.
**Complexity:** Low
**Multi-tenant relevance:** Tenants maintaining separate dev/staging/prod environments need key namespacing to prevent accidental cross-environment key reuse and to allow different scopes per environment.
**Multi-country relevance:** Some regulated markets (e.g. PCI-DSS for payment SaaS) mandate strict environment separation with distinct credential namespacing.

---

## Wiring & Settings

### Wire `apiKeyNegativeCacheTtlSeconds` Setting to the Service
**Why:** The setting is declared and shown in the UI but `api_key.service.ts` hardcodes `NEGATIVE_CACHE_TTL` and never reads it; the setting has zero runtime effect, which is a functional regression waiting to confuse operators.
**Complexity:** Low
**Multi-tenant relevance:** High-traffic tenants may want a shorter negative-cache window to improve recovery time after key creation; low-traffic security-sensitive tenants may want a longer window as a credential-stuffing defence.
**Multi-country relevance:** No direct country dimension, but wiring the setting is a prerequisite for per-tenant security posture customization needed in regulated markets.

### Webhook Events for Key Lifecycle (Update, Expiry)
**Why:** `api_key.created` and `api_key.deleted` webhooks fire, but `api_key.updated` (e.g. deactivation) and `api_key.expired` (background expiry sweep) do not, leaving webhook consumers with an incomplete key lifecycle picture.
**Complexity:** Low
**Multi-tenant relevance:** Tenants using webhooks to sync their own access management systems (SIEM, ITSM) need the full lifecycle event stream to maintain accurate state.
**Multi-country relevance:** SOC 2 and ISO 27001 audit trails (demanded by enterprise customers across North America, Europe, and APAC) require complete, real-time credential lifecycle events.

---

## Observability

### Per-Key Usage Counter (Request Count / Token Count)
**Why:** `lastUsedAt` records the timestamp of the most recent use but there is no counter of how many times a key has been used, making it impossible to report on key activity beyond "was it used recently."
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins need usage data per key to identify stale keys that can be safely revoked, and to enforce per-key rate limits.
**Multi-country relevance:** Audit requirements in financial services (MiFID II, FINRA) and healthcare (HIPAA) mandate traceable records of all API access — a request counter is a minimum viable signal.

### Key-Level Rate Limiting (Requests per Second / Minute)
**Why:** Rate limiting is applied globally at the Limiter layer; a single API key can consume the entire tenant rate-limit budget, starving other keys or session-based callers.
**Complexity:** Medium
**Multi-tenant relevance:** Allows tenants to allocate quota fairly across multiple integration keys (e.g. CI bot vs. production integration vs. analytics pipeline).
**Multi-country relevance:** Regulated API gateways in banking and telecoms (EU PSD2 TPP access) mandate per-client rate limits with published fair-use policies.
