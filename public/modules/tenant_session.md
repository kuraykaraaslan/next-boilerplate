# Tenant Session

- **id:** `tenant_session`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_session/`
- **tags:** tenant, auth
- **icon:** `fas fa-id-badge`
- **hasNextLayer:** true

Tenant-scoped session handling: bind a user session to a specific tenant, resolve tenant from request.

## Dependencies

- **requires:** `db`, `redis`, `user_session`, `tenant`, `env`

## Services

- `tenant_session.resolve.service.ts`
- `tenant_session.service.ts`

## Message keys

- `tenant_session.messages.ts`

## Setting keys

- `tenant_session.setting.keys.ts`

## Next layer (modules_next/) surface

- `tenant_session/tenant_session.service.next` _(service.next)_

## README

# Tenant Session Module

Tenant-scoped authentication and authorization for API routes and server actions. Resolves a tenant and the requesting user's membership from the per-tenant DB, validates tenant/member status, enforces the required role against a fixed role hierarchy, and caches the resolved session in Redis (default 5 minutes) with `sessionVersion`-based staleness detection.

---

## Entities

This module owns no tables. It reads two entities from the **per-tenant DB** (and the shared catalog DB for membership enumeration):

| Entity | Table | Description |
|---|---|---|
| `Tenant` | `tenant` | Resolved from `tenantDataSourceFor(tenantId)`; status (`tenantStatus`) is validated. Owned by the `tenant` module. |
| `TenantMember` | `tenant_member` | The requesting user's membership row: `memberRole`, `memberStatus`, `sessionVersion`. Owned by the `tenant_member` module. |

`getUserTenants` additionally reads `TenantMember` rows from the **shared catalog DataSource** (`getDataSource()`) to enumerate a user's memberships before re-reading each `Tenant` from its own per-tenant datasource.

---

## Service / Responsibilities

`TenantSessionService` (`tenant_session.service.ts`) — static methods only:

| Method | Responsibility |
|---|---|
| `authenticateTenantMembership({ user, tenantId, requiredRole? })` | Main entry point. Returns `{ tenant, tenantMember }` after validating tenant status, member status, and role. Checks the Redis cache first (with a `sessionVersion` recheck); on miss/stale, fully re-fetches and re-caches. Throws on not-found / inactive / suspended / pending / insufficient role. |
| `hasRequiredRole(memberRole, requiredRole)` | Role check against `ROLE_HIERARCHY = ['OWNER', 'ADMIN', 'USER']` — lower index satisfies a higher-or-equal requirement. |
| `getTenantById(tenantId)` | Reads the `Tenant` from the per-tenant datasource; returns `SafeTenant \| null`. |
| `getTenantMembership(tenantId, userId)` | Reads the non-deleted `TenantMember` from the per-tenant datasource; returns `SafeTenantMember \| null`. |
| `validateTenantStatus(tenant)` | Throws if `tenantStatus` is `INACTIVE` or `SUSPENDED`. |
| `validateMemberStatus(tenantMember)` | Throws if `memberStatus` is `INACTIVE`, `SUSPENDED`, or `PENDING`. |
| `getUserTenants(userId)` | Lists all tenants where the user is an `ACTIVE`, non-deleted member **and** the tenant itself is `ACTIVE`. |
| `clearTenantCache(userId, tenantId)` | Deletes the single cached session key. |
| `clearUserTenantCaches(userId)` | Deletes all cached sessions for a user across tenants. |

All return shapes are Zod-parsed (`SafeTenantSchema` / `SafeTenantMemberSchema`), so internal columns never leak to callers. Error strings come from `tenant_session.messages.ts` (`TenantAuthMessages`).

### Next.js request wrapper

The request/server-action surface (`authenticateTenantByRequest`, `authenticateRootTenantAdmin`, plus pass-throughs to `getUserTenants` / `clearTenantCache` / `clearUserTenantCaches`) lives in a separate `TenantSessionNextService` at `modules_next/tenant_session/tenant_session.service.next.ts`; it resolves the user/tenant from the request and delegates the authz decision to `TenantSessionService.authenticateTenantMembership`. API routes call the Next service, e.g. `app/tenant/[tenantId]/api/plans/route.ts`.

---

## Caching

Sessions are cached in Redis per `(userId, tenantId)` pair under key `tenant:member:${userId}:${tenantId}` for `TENANT_CACHE_TTL` (the `env.TENANT_CACHE_TTL` value, default `60 * 5` = 300s). On a cache hit the service does a lightweight DB read of just `sessionVersion`; if it differs from the cached value the entry is evicted and the session is fully re-fetched, so role/status revocation propagates within the TTL (immediately on the next request if `sessionVersion` was bumped). The required-role check is re-applied even on a cache hit.

---

## Usage

```typescript
import TenantSessionService from '@/modules/tenant_session/tenant_session.service';

// Require at least USER membership in this tenant:
const { tenant, tenantMember } = await TenantSessionService.authenticateTenantMembership({
  user,        // SafeUser
  tenantId,
  requiredRole: 'USER',
});

// Require ADMIN:
await TenantSessionService.authenticateTenantMembership({ user, tenantId, requiredRole: 'ADMIN' });

// List every ACTIVE tenant the user belongs to:
const tenants = await TenantSessionService.getUserTenants(user.userId);
```

---

## Settings

Setting keys are declared in `tenant_session.setting.keys.ts` as `TENANT_SECURITY_KEYS` (`TenantSecuritySettingKeySchema`): `twoFactorRequired`, `passwordMinLength`, `passwordRequireUppercase`, `passwordRequireNumbers`, `passwordRequireSymbols`, `sessionTimeout`, `maxLoginAttempts`, `ipWhitelist`, `ipBlacklist`, `ssoEnabled`, `ssoProvider`, `ssoConfig`.

**This module declares these keys but does not read any of them.** They are the security-policy surface consumed by the `auth` module's `auth.policy.service.ts` (password/session/lockout/access policies, resolved as a ROOT system value with optional per-tenant override). This module's own cache lifetime is the global `env.TENANT_CACHE_TTL` instead of the `sessionTimeout` setting — see *Tenant Variability*.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Tenant-scoped session/authorization service that resolves a tenant and the requesting user's membership from the per-tenant DB, validates tenant/member status and role, and caches the result in Redis; tenant variability comes from per-tenant tenant/member data rather than from settings it reads itself.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Tenant` | `tenant` | tenantStatus |
| `TenantMember` | `tenant_member` | memberRole, memberStatus, sessionVersion, externalId |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_session.service.ts:authenticateTenantMembership` — Authn/authz outcome is fully per-tenant: it resolves the Tenant and TenantMember from tenantDataSourceFor(tenantId), enforces tenant status (INACTIVE/SUSPENDED) and member status (INACTIVE/SUSPENDED/PENDING), and checks the member's role against the required role via ROLE_HIERARCHY. Each tenant has its own membership rows and statuses, so the same user can pass for one tenant and fail for another.
- `tenant_session.service.ts:authenticateTenantMembership` — Per-(tenantId,userId) Redis cache keyed `tenant:member:${userId}:${tenantId}`; staleness is detected per tenant by comparing the cached member's sessionVersion to the live per-tenant TenantMember.sessionVersion, so role/status revocation invalidates only that tenant's cached session.
- `tenant_session.service.ts:getTenantById / getTenantMembership` — Both read from the per-tenant data source (tenantDataSourceFor(tenantId)), so tenant and membership records are isolated per tenant.
- `tenant_session.service.ts:getUserTenants` — Enumerates a user's ACTIVE memberships from the shared catalog, then re-reads each Tenant from its own per-tenant datasource and includes only ACTIVE tenants — result set varies by each tenant's status.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Cache TTL for tenant membership sessions is a single global value (TENANT_CACHE_TTL from env, fallback 300s) | `tenant_session.service.ts — const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60*5), used in redis.setex in authenticateTenantMembership` | Session/membership freshness is a security-sensitive, tenant-specific concern; a high-security tenant may want shorter session caching (faster revocation propagation) while others want longer for performance. Today it is global env-only and cannot vary per tenant. The module already declares a sessionTimeout key but does not read it here. | `tenantSessionCacheTtl` |
| Role hierarchy / privilege model is hardcoded as a fixed OWNER>ADMIN>USER array | `tenant_session.service.ts — ROLE_HIERARCHY and hasRequiredRole` | The set and ordering of tenant roles is identical for every tenant; tenants cannot define custom roles or a different privilege ordering. Likely intentionally global as a shared RBAC primitive, but flagged as a plausible per-tenant customization point if custom roles are ever needed. | — |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `twoFactorRequired` — Declared in tenant_session.setting.keys.ts (TENANT_SECURITY_KEYS) but NOT read by this module; consumed by the auth module's auth.policy.service.ts via a system(ROOT)-then-tenant override resolve. Listed here only because tenant_session declares it; the real per-tenant override surface lives in the auth module.
- `passwordMinLength` — Declared here, read by auth.policy.service.ts (getPasswordPolicy) as ROOT system value with optional tenant override; seeded at ROOT as '12'. Not read by tenant_session.
- `passwordRequireUppercase` — Declared here; read/resolved in auth.policy.service.ts, not tenant_session.
- `passwordRequireNumbers` — Declared here; password policy resolved in auth.policy.service.ts (uses passwordRequireDigit), not tenant_session.
- `passwordRequireSymbols` — Declared here; password policy resolved in auth.policy.service.ts (uses passwordRequireSpecial), not tenant_session.
- `sessionTimeout` — Declared here; session policy resolved in auth.policy.service.ts (getSessionPolicy), not tenant_session. The module's own cache TTL is the global env var TENANT_CACHE_TTL instead.
- `maxLoginAttempts` — Declared here; lockout policy resolved in auth.policy.service.ts (getLockoutPolicy), seeded at ROOT as '5'. Not read by tenant_session.
- `ipWhitelist` — Declared here; access policy in auth.policy.service.ts (getAccessPolicy), not read by tenant_session.
- `ipBlacklist` — Declared here; access policy in auth.policy.service.ts (getAccessPolicy), not read by tenant_session.
- `ssoEnabled` — Declared here; SSO gating handled outside tenant_session (auth/sso modules). Not read by this module.
- `ssoProvider` — Declared here; SSO provider selection handled outside tenant_session. Not read by this module.
- `ssoConfig` — Declared here; SSO config consumed outside tenant_session. Not read by this module.

---

## Dependencies

`requires`: `db`, `redis`, `user_session`, `tenant`, `env` (see `module.json`). Also reads the `tenant_member` entity/types and `TenantMemberRole` enum.
