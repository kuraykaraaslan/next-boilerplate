# Good to Have — Tenant Session Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Session Security

### `sessionTimeout` Setting Wired to Cache TTL
**Why:** The module declares `sessionTimeout` in `TENANT_SECURITY_KEYS` but the cache TTL is always the global `env.TENANT_CACHE_TTL` — high-security tenants that set a 15-minute session timeout get no benefit because the cached session can remain valid for 5 minutes after the actual JWT expires.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant should control how long a resolved session is cached; a financial-services tenant with a 10-minute session policy should have its cache TTL respect that setting, not a global env var.
**Multi-country relevance:** EU NIS2, DORA, and UK FCA operational resilience requirements mandate that session lifetime controls are enforced per organisation — a global TTL defeats per-tenant security policies.

### IP-Based Access Control (Whitelist/Blacklist) Enforcement in Session Resolution
**Why:** `ipWhitelist` and `ipBlacklist` keys are declared in `TENANT_SECURITY_KEYS` and documented, but `authenticateTenantMembership` never reads them — a tenant that configures IP restrictions gets no enforcement at the session layer.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants restrict platform access to corporate IP ranges (VPN, office networks); the setting being declared but unenforced is a false security promise.
**Multi-country relevance:** National cybersecurity requirements (Germany BSI, France ANSSI, Japan METI guidelines) for sensitive industries require IP-based access control as a baseline — unenforced settings create compliance gaps.

### Concurrent Session Limiting Per Member
**Why:** There is no check for how many concurrent sessions a single member has across devices — a stolen token can be used indefinitely alongside the legitimate session with no detection or enforcement.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants with shared-account concerns need to limit sessions to N devices per member; high-security tenants want single-session enforcement.
**Multi-country relevance:** PSD2 (EU) Strong Customer Authentication and UK FCA rules require financial-platform sessions to be single-session by default — concurrent session limits are a compliance prerequisite in fintech.

### Geolocation-Based Session Anomaly Detection
**Why:** A session resolved from Germany is immediately followed by one from Brazil — there is no impossible-travel detection that could flag this as a potential session hijack.
**Complexity:** High
**Multi-tenant relevance:** Tenant admins managing sensitive operations need alerts when a team member's session appears to be used from an implausible location.
**Multi-country relevance:** GDPR Art. 32 requires "appropriate technical and organisational measures" — impossible-travel detection is a standard security control in EU-facing SaaS platforms.

### Two-Factor Authentication Enforcement at the Tenant Session Layer
**Why:** `twoFactorRequired` is declared in `TENANT_SECURITY_KEYS` but `authenticateTenantMembership` never checks it — a tenant that mandates MFA gets no enforcement in the session resolution path.
**Complexity:** Medium
**Multi-tenant relevance:** Enterprise tenants (finance, healthcare, legal) mandate 2FA for all users; without enforcement at the session layer a user without 2FA enrolled can access the tenant.
**Multi-country relevance:** DORA (EU), UK NCSC Cyber Essentials, and US CISA guidelines all recommend or mandate MFA for access to sensitive systems — enforcement at the tenant session layer is the minimal viable implementation.

## Performance & Scalability

### `getUserTenants` N+1 Query Issue
**Why:** `getUserTenants` iterates `members` sequentially with a `for...of` loop, calling `tenantDataSourceFor(m.tenantId)` for each member — a user in 20 tenants makes 20 sequential async calls instead of batching.
**Complexity:** Low
**Multi-tenant relevance:** Power users and service accounts that are members of many tenants will see slow tenant-list loading; the latency compounds with each membership.
**Multi-country relevance:** Latency is amplified in globally distributed deployments where each `tenantDataSourceFor` call might hit a different regional DB; batching reduces cross-region round-trips.

### `clearUserTenantCaches` Uses `KEYS` Command (Blocking)
**Why:** `clearUserTenantCaches` calls `redis.keys('tenant:member:{userId}:*')` — `KEYS` is O(N) over all Redis keys and blocks the Redis server; in production this can cause latency spikes for all tenants sharing the Redis instance.
**Complexity:** Low
**Multi-tenant relevance:** A user who is a member of many tenants triggering a `clearUserTenantCaches` call can block the shared Redis instance, causing latency for all other tenants.
**Multi-country relevance:** No direct country relevance, but a Redis stall affects all tenants globally, including those in latency-sensitive regions.

## Observability

### Session Audit Log (Login, Role Check, Denial)
**Why:** `authenticateTenantMembership` throws on denial but does not emit an audit log or structured event — failed role checks (potential privilege escalation attempts) are invisible to tenant admins and security monitoring tools.
**Complexity:** Low
**Multi-tenant relevance:** Security monitoring per tenant requires a stream of authentication and authorization events — denials are especially valuable signals.
**Multi-country relevance:** ISO 27001 A.9.4.2 (secure log-on procedures), GDPR Art. 32, and US SOC 2 CC7.2 all require logging of access-control decisions — a missing audit trail is a compliance gap.

### `authenticateTenantByRequest` Rate Limiting at the Session Layer
**Why:** Rate limiting is applied at the API route layer via `Limiter.checkRateLimit`, but `authenticateTenantMembership` itself has no burst protection — a burst of unauthenticated requests that all pass the rate limiter but fail membership checks will hammer the per-tenant DB.
**Complexity:** Low
**Multi-tenant relevance:** One tenant's burst of auth failures should not degrade DB performance for other tenants on the same datasource.
**Multi-country relevance:** Credential-stuffing attacks are geographically targeted; a per-tenant circuit breaker at the session layer limits the blast radius of attacks aimed at specific regional tenants.

## Onboarding & Developer Experience

### Typed Session Context Propagation to Route Handlers
**Why:** `authenticateTenantByRequest` resolves `{ tenant, tenantMember, user }` but each API route independently re-fetches parts of this context; there is no middleware that attaches the resolved session to the Next.js request context for downstream handlers to consume without re-querying.
**Complexity:** Medium
**Multi-tenant relevance:** Eliminating redundant auth DB queries on every route is important as the number of routes grows; a typed session context object prevents copy-paste of auth boilerplate.
**Multi-country relevance:** No direct country relevance, but reducing per-request DB queries lowers latency for tenants on distant regional nodes.
