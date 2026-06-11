# Admin Impersonation

- **id:** `auth_impersonation`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/auth_impersonation/`
- **tags:** identity, auth, admin
- **icon:** `fas fa-user-secret`
- **hasNextLayer:** false

Allow a system admin to assume a target user's session (always audited).

## Dependencies

- **requires:** `user`, `user_session`, `audit_log`, `env`

## Services

- `impersonation.service.ts`

## DTOs

- `impersonation.dto.ts`

## Message keys

- `impersonation.messages.ts`

## README

# Auth Impersonation Module

Lets a system admin (or a tenant `OWNER`/`ADMIN`) assume a target user's session for testing and support. Every impersonation is gated by role checks, runs in a dedicated tracked session, and is written to the audit log. The module has no entities or settings of its own — it composes `user`, `user_session`, `tenant_member`, and `audit_log`.

---

## Files

| File | Purpose |
|---|---|
| `impersonation.service.ts` | Core logic: start (system / tenant flows), end, and look up the active impersonation session; role/membership validation. |
| `impersonation.dto.ts` | `StartSystemImpersonationDTO`, `StartTenantImpersonationDTO` (Zod). |
| `impersonation.messages.ts` | `ImpersonationMessages` error/status string enum. |
| `module.json` | Module manifest (`requires`: `user`, `user_session`, `audit_log`, `env`). |

This module owns **no entities** and **no settings**. Impersonation sessions are stored as ordinary `UserSession` rows (in the **system DB**) tagged with `metadata.impersonation`.

---

## Service responsibilities (`ImpersonationService`)

| Method | Responsibility |
|---|---|
| `startSystemImpersonation` | System-admin flow. Loads the target `User` from the system DB, asserts the impersonator is not the target, and asserts **global role dominance** (`GLOBAL_ROLE_ORDER = { USER: 0, ADMIN: 1 }` — impersonator must outrank target). Resolves the target's tenant role from `TenantMember` in `tenantDataSourceFor(tenantId)` (defaulting to `'USER'`) unless `targetTenantRole` is supplied, then mints an impersonation session and logs `IMPERSONATION_STARTED` (`flow: 'system'`). |
| `startTenantImpersonation` | Tenant `OWNER`/`ADMIN` flow. Loads the target `User`, asserts not-self, then reads `TenantMember` from the tenant DB: throws `TARGET_NOT_MEMBER_OF_TENANT` if the target is not a member and `TARGET_MUST_BE_TENANT_USER` unless `memberRole === 'USER'`. Mints an impersonation session with `targetTenantRole: 'USER'` and logs `IMPERSONATION_STARTED` (`flow: 'tenant'`). |
| `endImpersonationSession` | Deletes the impersonation `UserSession` via `UserSessionService.deleteSession`, and (when an `actorId` is provided) logs `IMPERSONATION_ENDED`. |
| `getActiveImpersonationSession` | Hashes the raw access token, looks up the matching `UserSession`, and returns it only if it carries `metadata.impersonation` and has not expired — otherwise `null`. |

Both start flows return `{ userSession, rawAccessToken, rawRefreshToken }`. Session creation (including the 1-hour TTL) lives in `user_session` — see *Tenant Variability*.

---

## Role hierarchy

- **Global (system flow):** `GLOBAL_ROLE_ORDER = { USER: 0, ADMIN: 1 }`. An impersonator may only impersonate a **strictly lower** global role (an `ADMIN` may impersonate a `USER`; equal-or-higher is rejected with `CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE`). Unknown roles fall back to `0`.
- **Tenant flow:** the target must be a member of the tenant whose `memberRole` is exactly `USER`; tenant `OWNER`/`ADMIN`/other roles cannot be impersonated through this flow.
- No one can impersonate themselves (`CANNOT_IMPERSONATE_SELF`).

---

## API Routes

The tenant flow is wired to HTTP; the system flow (`startSystemImpersonation`) is exposed only as a service method today (no dedicated route).

| Method | Path | Scope | Description |
|---|---|---|---|
| POST | `/tenant/[tenantId]/api/auth/impersonate` | tenant `ADMIN`+ | Start impersonating a tenant `USER` (`StartTenantImpersonationDTO`). Sets `accessToken`/`refreshToken` to the impersonation session and backs up the caller's tokens as `impersonatorAccessToken`/`impersonatorRefreshToken` cookies. |
| DELETE | `/tenant/[tenantId]/api/auth/impersonate` | impersonating session | Exit impersonation: ends the impersonation session and restores the backed-up original tokens. Returns `NOT_CURRENTLY_IMPERSONATING` if the backup cookies are absent. |
| GET | `/tenant/[tenantId]/api/auth/impersonate` | impersonating session | Report impersonation status (`isImpersonating`, plus `impersonatorUserId` / `tenantId` / `targetTenantRole` from session metadata). |
| GET | `/tenant/[tenantId]/api/users/[userId]/impersonation-sessions` | admin | Paginated list of a user's impersonation `UserSession` rows (`?page=&pageSize=&activeOnly=`). |

Mutating routes are rate-limited via `Limiter`.

---

## Usage

```typescript
import ImpersonationService from '@/modules/auth_impersonation/impersonation.service';

// Tenant OWNER/ADMIN impersonates a tenant USER:
const { userSession, rawAccessToken, rawRefreshToken } =
  await ImpersonationService.startTenantImpersonation({
    impersonatorUser,        // SafeUser (the admin)
    impersonatorMember,      // SafeTenantMember
    impersonatorSession,     // SafeUserSession (the admin's session)
    targetUserId,            // tenant USER to impersonate
    tenantId,
    ipAddress,
    userAgent,
  });

// End impersonation (also writes IMPERSONATION_ENDED to the audit log):
await ImpersonationService.endImpersonationSession(userSession.userSessionId, {
  actorId: impersonatorUser.userId,
  targetUserId,
  tenantId,
});
```

The HTTP DELETE on `…/api/auth/impersonate` performs the same cleanup and swaps the cookies back to the original session.

---

## Security

- **No self-impersonation** and **global role dominance** are enforced in `startSystemImpersonation`; **tenant membership + `USER`-role** is enforced in `startTenantImpersonation`.
- **Audited:** every start logs `IMPERSONATION_STARTED` and every end (with an actor) logs `IMPERSONATION_ENDED` to the audit log, with `actorId`, target `resourceId`, `tenantId`, `targetTenantRole`, `flow`, `ipAddress`, and `userAgent` metadata. Queryable via the audit log API.
- **Reversible:** the original caller's tokens are stored in `impersonatorAccessToken`/`impersonatorRefreshToken` cookies so DELETE can restore the original session.
- **Bounded sessions:** impersonation sessions carry `metadata.impersonation` and expire after a fixed 1-hour TTL (see *Tenant Variability*); `getActiveImpersonationSession` rejects expired or non-impersonation sessions.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Lets a system admin (or tenant OWNER/ADMIN) assume a target user's audited session; it has no per-tenant settings or own entities and only uses tenantId to resolve the target's membership/role from the per-tenant DB, so its tenant surface is minimal.

### Per-tenant behavior

- `impersonation.service.ts:startSystemImpersonation` — Resolves the target's tenant role by reading TenantMember from tenantDataSourceFor(tenantId) (where tenantId, userId, deletedAt IS NULL); the resolved targetTenantRole baked into the impersonation session depends on that tenant's membership rows, defaulting to 'USER' when no membership exists.
- `impersonation.service.ts:startTenantImpersonation` — Reads TenantMember from the tenant DB and gates impersonation per tenant: throws TARGET_NOT_MEMBER_OF_TENANT if the user is not a member of this tenant, and TARGET_MUST_BE_TENANT_USER unless memberRole === 'USER', so who can be impersonated is determined by each tenant's own membership data.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Impersonation session lifetime is a hardcoded global 1-hour TTL (IMPERSONATION_SESSION_TTL_MS = 60 * 60 * 1000), applied to every impersonation session regardless of tenant. | `user_session.crud.service.ts:createImpersonationSession (constant IMPERSONATION_SESSION_TTL_MS), invoked from impersonation.service.ts startSystemImpersonation/startTenantImpersonation` | Ordinary session policy already varies per tenant via AuthPolicyService.getSessionPolicy(tenantId) (sessionIdleTimeoutMinutes / absoluteMaxHours), so a fixed impersonation TTL is inconsistent — tenants with stricter security postures would reasonably want shorter support-impersonation windows. Note the TTL lives in user_session, not in this module. | `impersonationSessionTtlMinutes` |
| Global role-dominance ordering (GLOBAL_ROLE_ORDER = { USER: 0, ADMIN: 1 }) hardcodes who may impersonate whom in the system flow. | `impersonation.service.ts (GLOBAL_ROLE_ORDER constant, used by assertGlobalRoleDominance)` | This is intentionally global platform-level authorization, not tenant-configurable — global user roles are a system concern, so this should remain global; listed only for completeness, not as a recommended per-tenant key. | — |

---

## Dependencies

`requires`: `user`, `user_session`, `audit_log`, `env`. Also reads `tenant_member` (target membership/role) at runtime.
